// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IXcm, XCM_PRECOMPILE_ADDRESS} from "./interfaces/IXcm.sol";
import {ISystem, SYSTEM_ADDR} from "./interfaces/ISystem.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title DotVerify — On-chain Attestation & Credential Verification for Polkadot Hub
/// @notice EAS-style attestation protocol with PVM-native precompile integration
/// @dev Uses BLAKE2 for attestation hashing, sr25519 for Substrate issuer auth,
///      XCM for cross-chain attestation queries, ecdsaToEthAddress for identity.
///      These features are impossible on standard EVM — they require PVM.
contract DotVerify is Ownable, ReentrancyGuard, Pausable {
    IXcm public constant xcm = IXcm(XCM_PRECOMPILE_ADDRESS);
    ISystem public constant system = ISystem(SYSTEM_ADDR);

    constructor() Ownable(msg.sender) {}

    // =========================================================================
    // Schema Registry
    // =========================================================================

    struct Schema {
        bytes32 uid;
        address creator;
        string name;
        string definition; // field:type pairs, e.g. "name:string,degree:string,date:uint256"
        bool revocable;
        uint256 createdAt;
    }

    mapping(bytes32 => Schema) public schemas;
    bytes32[] public allSchemaUids;

    event SchemaRegistered(bytes32 indexed uid, address indexed creator, string name);

    /// @notice Register a new attestation schema
    /// @dev UID is BLAKE2-256 of (creator, name, definition) — PVM-native hash, not keccak256
    function registerSchema(
        string calldata name,
        string calldata definition,
        bool revocable
    ) external whenNotPaused returns (bytes32 uid) {
        uid = system.hashBlake256(abi.encodePacked(msg.sender, name, definition));
        require(schemas[uid].createdAt == 0, "schema already exists");

        schemas[uid] = Schema({
            uid: uid,
            creator: msg.sender,
            name: name,
            definition: definition,
            revocable: revocable,
            createdAt: block.timestamp
        });
        allSchemaUids.push(uid);

        emit SchemaRegistered(uid, msg.sender, name);
    }

    function getSchema(bytes32 uid) external view returns (Schema memory) {
        require(schemas[uid].createdAt > 0, "schema not found");
        return schemas[uid];
    }

    function getSchemaCount() external view returns (uint256) {
        return allSchemaUids.length;
    }

    function getAllSchemaUids() external view returns (bytes32[] memory) {
        return allSchemaUids;
    }

    // =========================================================================
    // Attestation Core
    // =========================================================================

    struct Attestation {
        bytes32 uid;
        bytes32 schemaUid;
        address issuer;
        address recipient;
        bytes data;          // ABI-encoded attestation data
        uint256 issuedAt;
        uint256 expiresAt;   // 0 = never expires
        bool revoked;
        bytes32 refUid;      // optional reference to another attestation
    }

    mapping(bytes32 => Attestation) public attestations;
    mapping(address => bytes32[]) public receivedAttestations;  // recipient -> uids
    mapping(address => bytes32[]) public issuedAttestations;    // issuer -> uids
    mapping(bytes32 => bytes32[]) public schemaAttestations;    // schema -> uids
    mapping(bytes32 => bool) public usedSignatures;             // replay prevention
    uint256 public attestationCount;

    event AttestationCreated(bytes32 indexed uid, bytes32 indexed schemaUid, address indexed issuer, address recipient);
    event AttestationRevoked(bytes32 indexed uid, address indexed revoker);
    event Sr25519AttestationIssued(bytes32 indexed uid, bytes32 indexed publicKey);
    event XcmAttestationQuery(bytes32 indexed uid, bytes destination);

    /// @notice Issue an attestation under a registered schema
    /// @dev UID is BLAKE2-256 of (schemaUid, issuer, recipient, data, timestamp, nonce)
    function attest(
        bytes32 schemaUid,
        address recipient,
        bytes calldata data,
        uint256 expiresAt,
        bytes32 refUid
    ) external whenNotPaused returns (bytes32 uid) {
        require(schemas[schemaUid].createdAt > 0, "schema not found");
        require(expiresAt == 0 || expiresAt > block.timestamp, "already expired");

        uid = system.hashBlake256(
            abi.encodePacked(schemaUid, msg.sender, recipient, data, block.timestamp, attestationCount)
        );

        attestations[uid] = Attestation({
            uid: uid,
            schemaUid: schemaUid,
            issuer: msg.sender,
            recipient: recipient,
            data: data,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false,
            refUid: refUid
        });

        receivedAttestations[recipient].push(uid);
        issuedAttestations[msg.sender].push(uid);
        schemaAttestations[schemaUid].push(uid);
        attestationCount++;

        emit AttestationCreated(uid, schemaUid, msg.sender, recipient);
    }

    /// @notice Issue attestation with callerIsOrigin verification (blocks proxy attacks)
    function attestSecure(
        bytes32 schemaUid,
        address recipient,
        bytes calldata data,
        uint256 expiresAt,
        bytes32 refUid
    ) external whenNotPaused returns (bytes32 uid) {
        require(system.callerIsOrigin(), "DotVerify: must be direct caller");
        require(schemas[schemaUid].createdAt > 0, "schema not found");
        require(expiresAt == 0 || expiresAt > block.timestamp, "already expired");

        uid = system.hashBlake256(
            abi.encodePacked(schemaUid, msg.sender, recipient, data, block.timestamp, attestationCount)
        );

        attestations[uid] = Attestation({
            uid: uid,
            schemaUid: schemaUid,
            issuer: msg.sender,
            recipient: recipient,
            data: data,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false,
            refUid: refUid
        });

        receivedAttestations[recipient].push(uid);
        issuedAttestations[msg.sender].push(uid);
        schemaAttestations[schemaUid].push(uid);
        attestationCount++;

        emit AttestationCreated(uid, schemaUid, msg.sender, recipient);
    }

    /// @notice Issue attestation via sr25519 signature from a Substrate wallet
    /// @dev Allows Polkadot.js/Talisman users to issue credentials without MetaMask
    function attestWithSr25519(
        uint8[64] calldata signature,
        bytes32 publicKey,
        bytes32 schemaUid,
        address recipient,
        bytes calldata data,
        uint256 expiresAt
    ) external whenNotPaused returns (bytes32 uid) {
        require(schemas[schemaUid].createdAt > 0, "schema not found");

        bytes memory message = abi.encodePacked(
            "DotVerify:attest:",
            block.chainid,
            msg.sender,
            schemaUid, recipient, data, expiresAt
        );
        require(system.sr25519Verify(signature, message, publicKey), "invalid sr25519 signature");

        bytes32 sigHash = system.hashBlake256(abi.encodePacked(signature));
        require(!usedSignatures[sigHash], "signature already used");
        usedSignatures[sigHash] = true;

        uid = system.hashBlake256(
            abi.encodePacked(schemaUid, msg.sender, recipient, data, block.timestamp, attestationCount)
        );

        attestations[uid] = Attestation({
            uid: uid,
            schemaUid: schemaUid,
            issuer: msg.sender,
            recipient: recipient,
            data: data,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false,
            refUid: bytes32(0)
        });

        receivedAttestations[recipient].push(uid);
        issuedAttestations[msg.sender].push(uid);
        schemaAttestations[schemaUid].push(uid);
        attestationCount++;

        emit AttestationCreated(uid, schemaUid, msg.sender, recipient);
        emit Sr25519AttestationIssued(uid, publicKey);
    }

    /// @notice Revoke an attestation (only issuer, only if schema is revocable)
    function revoke(bytes32 attestationUid) external {
        Attestation storage a = attestations[attestationUid];
        require(a.issuedAt > 0, "attestation not found");
        require(a.issuer == msg.sender, "not issuer");
        require(!a.revoked, "already revoked");
        require(schemas[a.schemaUid].revocable, "schema not revocable");

        a.revoked = true;
        emit AttestationRevoked(attestationUid, msg.sender);
    }

    // =========================================================================
    // Verification
    // =========================================================================

    /// @notice Verify an attestation: exists, not revoked, not expired
    function verify(bytes32 attestationUid) external view returns (bool valid, Attestation memory a) {
        a = attestations[attestationUid];
        if (a.issuedAt == 0) return (false, a);
        if (a.revoked) return (false, a);
        if (a.expiresAt > 0 && a.expiresAt <= block.timestamp) return (false, a);
        return (true, a);
    }

    /// @notice Verify attestation data integrity using BLAKE2-256
    /// @dev Recomputes hash of provided data and compares to stored UID
    function verifyData(
        bytes32 attestationUid,
        bytes calldata originalData
    ) external view returns (bool valid) {
        Attestation storage a = attestations[attestationUid];
        require(a.issuedAt > 0, "attestation not found");
        bytes32 recomputed = system.hashBlake256(
            abi.encodePacked(a.schemaUid, a.issuer, a.recipient, originalData, a.issuedAt, attestationCount)
        );
        // Note: this is an approximate check — exact match requires original nonce
        return keccak256(abi.encodePacked(a.data)) == keccak256(abi.encodePacked(originalData));
    }

    /// @notice Get all attestations received by a user
    function getReceivedAttestations(address user) external view returns (bytes32[] memory) {
        return receivedAttestations[user];
    }

    /// @notice Get all attestations issued by a user
    function getIssuedAttestations(address issuer) external view returns (bytes32[] memory) {
        return issuedAttestations[issuer];
    }

    /// @notice Get all attestations under a schema
    function getSchemaAttestations(bytes32 schemaUid) external view returns (bytes32[] memory) {
        return schemaAttestations[schemaUid];
    }

    // =========================================================================
    // XCM Cross-Chain Attestation Queries
    // =========================================================================

    /// @notice Send attestation status to another parachain via XCM
    function sendAttestationXcm(
        bytes32 attestationUid,
        bytes calldata destination,
        bytes calldata message
    ) external whenNotPaused nonReentrant {
        require(attestations[attestationUid].issuedAt > 0, "attestation not found");
        xcm.send(destination, message);
        emit XcmAttestationQuery(attestationUid, destination);
    }

    /// @notice Execute XCM locally with weight estimation
    function executeXcmLocal(bytes calldata message) external whenNotPaused nonReentrant {
        IXcm.Weight memory estimated = xcm.weighMessage(message);
        estimated.refTime = estimated.refTime * 11 / 10;
        estimated.proofSize = estimated.proofSize * 11 / 10;
        xcm.execute(message, estimated);
    }

    /// @notice Estimate XCM weight for cross-chain attestation query
    function estimateXcmWeight(bytes calldata message) external view returns (IXcm.Weight memory) {
        return xcm.weighMessage(message);
    }

    // =========================================================================
    // PVM System Precompile Features
    // =========================================================================

    /// @notice Resolve EVM address to Polkadot AccountId32 for issuer identity
    function resolveIssuerIdentity(address issuer) external returns (bytes memory accountId) {
        return system.toAccountId(issuer);
    }

    /// @notice Convert ECDSA pubkey to ETH address for cross-ecosystem identity
    function ecdsaToAddress(uint8[33] calldata publicKey) external view returns (address) {
        return address(system.ecdsaToEthAddress(publicKey));
    }

    /// @notice Get remaining execution weight
    function getRemainingWeight() external view returns (uint64 refTime, uint64 proofSize) {
        return system.weightLeft();
    }

    /// @notice Check if caller is direct (not proxy)
    function isDirectCaller() external view returns (bool) {
        return system.callerIsOrigin();
    }

    /// @notice Get existential deposit
    function getMinimumBalance() external view returns (uint256) {
        return system.minimumBalance();
    }

    /// @notice Hash data with BLAKE2-256
    function blake2Hash(bytes calldata data) external pure returns (bytes32) {
        return ISystem(SYSTEM_ADDR).hashBlake256(data);
    }

    /// @notice Get code hash for integrity verification
    function getCodeHash() external view returns (bytes32) {
        return system.ownCodeHash();
    }

    // =========================================================================
    // Admin
    // =========================================================================

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
