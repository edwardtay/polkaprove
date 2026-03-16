// SPDX-License-Identifier: MIT
// Source: https://github.com/paritytech/polkadot-sdk/blob/master/substrate/frame/revive/uapi/sol/ISystem.sol
pragma solidity ^0.8.0;

address constant SYSTEM_ADDR = 0x0000000000000000000000000000000000000900;

interface ISystem {
    function hashBlake256(bytes memory input) external pure returns (bytes32 digest);
    function hashBlake128(bytes memory input) external pure returns (bytes32 digest);
    function toAccountId(address input) external view returns (bytes memory account_id);
    function callerIsOrigin() external view returns (bool);
    function callerIsRoot() external view returns (bool);
    function minimumBalance() external view returns (uint);
    function ownCodeHash() external view returns (bytes32);
    function weightLeft() external view returns (uint64 refTime, uint64 proofSize);
    function terminate(address beneficiary) external;
    function sr25519Verify(uint8[64] calldata signature, bytes calldata message, bytes32 publicKey) external view returns (bool);
    function ecdsaToEthAddress(uint8[33] calldata publicKey) external view returns (bytes20);
}
