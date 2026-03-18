// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ISystem, SYSTEM_ADDR} from "./interfaces/ISystem.sol";

/// @title PolkaProveVerifier — On-chain zkTLS attestation signature verification
/// @notice Verifies that a zkTLS attestation was signed by a registered Primus attestor
/// @dev Uses ecrecover for ECDSA signatures + BLAKE2 for PVM-native hashing
contract PolkaProveVerifier {
    ISystem public constant system = ISystem(SYSTEM_ADDR);

    address public owner;
    mapping(address => bool) public trustedAttestors;
    address[] public attestorList;

    event AttestorAdded(address indexed attestor);
    event AttestorRemoved(address indexed attestor);
    event AttestationVerified(bytes32 indexed dataHash, address indexed attestor, address indexed recipient);

    constructor() {
        owner = msg.sender;
    }

    function addAttestor(address attestor) external {
        require(msg.sender == owner, "not owner");
        require(!trustedAttestors[attestor], "already trusted");
        trustedAttestors[attestor] = true;
        attestorList.push(attestor);
        emit AttestorAdded(attestor);
    }

    function removeAttestor(address attestor) external {
        require(msg.sender == owner, "not owner");
        trustedAttestors[attestor] = false;
        emit AttestorRemoved(attestor);
    }

    /// @notice Verify a zkTLS attestation signature on-chain
    /// @param data The attestation data (JSON bytes)
    /// @param signature The attestor's ECDSA signature (65 bytes: r, s, v)
    /// @return valid True if signature is from a trusted attestor
    /// @return attestor The recovered attestor address
    /// @return dataHash BLAKE2-256 hash of the data (PVM-native)
    function verifyZkTlsAttestation(
        bytes calldata data,
        bytes calldata signature
    ) external view returns (bool valid, address attestor, bytes32 dataHash) {
        require(signature.length == 65, "invalid sig length");

        // Hash the data with BLAKE2-256 (PVM-native)
        dataHash = system.hashBlake256(data);

        // Also create an Ethereum signed message hash for ecrecover
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));

        // Recover signer
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;

        attestor = ecrecover(ethHash, v, r, s);
        valid = trustedAttestors[attestor];
    }

    /// @notice Verify and anchor in one call — verify signature then store BLAKE2 hash
    /// @dev Combines verification + anchoring for a complete zkTLS → on-chain flow
    function verifyAndAnchor(
        bytes calldata data,
        bytes calldata signature,
        address polkaProve
    ) external returns (bool valid, address attestor, bytes32 anchorId) {
        bytes32 dataHash;
        (valid, attestor, dataHash) = this.verifyZkTlsAttestation(data, signature);
        require(valid, "untrusted attestor");

        // Anchor on PolkaProve
        (bool success, bytes memory result) = polkaProve.call(
            abi.encodeWithSignature("anchorOffchain(bytes)", data)
        );
        require(success, "anchor failed");
        anchorId = abi.decode(result, (bytes32));

        emit AttestationVerified(dataHash, attestor, msg.sender);
    }

    function getAttestors() external view returns (address[] memory) {
        return attestorList;
    }

    function isAttestorTrusted(address attestor) external view returns (bool) {
        return trustedAttestors[attestor];
    }
}
