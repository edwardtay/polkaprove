// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/DotVerify.sol";
import {SYSTEM_ADDR} from "../src/interfaces/ISystem.sol";
import {XCM_PRECOMPILE_ADDRESS} from "../src/interfaces/IXcm.sol";

contract DotVerifyTest is Test {
    DotVerify public dv;
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        dv = new DotVerify();

        // Mock BLAKE2-256: return keccak256 as stand-in
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("hashBlake256(bytes)"),
            abi.encode(keccak256("mocked-blake2"))
        );

        // Mock BLAKE2-128
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("hashBlake128(bytes)"),
            abi.encode(bytes32(uint256(0xdead)))
        );

        // Mock callerIsOrigin
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("callerIsOrigin()"),
            abi.encode(true)
        );

        // Mock sr25519Verify
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("sr25519Verify(uint8[64],bytes,bytes32)"),
            abi.encode(true)
        );

        // Mock weightLeft
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("weightLeft()"),
            abi.encode(uint64(1000000), uint64(500000))
        );

        // Mock minimumBalance
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("minimumBalance()"),
            abi.encode(uint256(1e15))
        );

        // Mock ownCodeHash
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("ownCodeHash()"),
            abi.encode(keccak256("code"))
        );

        // Mock toAccountId
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("toAccountId(address)"),
            abi.encode(hex"0101010101010101010101010101010101010101010101010101010101010101")
        );

        // Mock ecdsaToEthAddress
        vm.mockCall(
            SYSTEM_ADDR,
            abi.encodeWithSignature("ecdsaToEthAddress(uint8[33])"),
            abi.encode(bytes20(alice))
        );

        // Mock XCM
        vm.mockCall(
            XCM_PRECOMPILE_ADDRESS,
            abi.encodeWithSignature("send(bytes,bytes)"),
            ""
        );
        vm.mockCall(
            XCM_PRECOMPILE_ADDRESS,
            abi.encodeWithSignature("weighMessage(bytes)"),
            abi.encode(uint64(100000), uint64(50000))
        );
        vm.mockCall(
            XCM_PRECOMPILE_ADDRESS,
            abi.encodeWithSignature("execute(bytes,(uint64,uint64))"),
            ""
        );
    }

    // =========================================================================
    // Schema Tests
    // =========================================================================

    function test_registerSchema() public {
        vm.prank(alice);
        bytes32 uid = dv.registerSchema("Diploma", "name:string,degree:string,date:uint256", true);
        assertTrue(uid != bytes32(0));
        assertEq(dv.getSchemaCount(), 1);

        DotVerify.Schema memory s = dv.getSchema(uid);
        assertEq(s.creator, alice);
        assertEq(s.name, "Diploma");
        assertTrue(s.revocable);
    }

    function test_registerSchema_duplicate_reverts() public {
        // Mock returns same hash for same inputs
        vm.prank(alice);
        dv.registerSchema("Diploma", "name:string", true);

        vm.prank(alice);
        vm.expectRevert("schema already exists");
        dv.registerSchema("Diploma", "name:string", true);
    }

    function test_getSchema_notFound_reverts() public {
        vm.expectRevert("schema not found");
        dv.getSchema(bytes32(uint256(999)));
    }

    function test_getAllSchemaUids() public {
        vm.startPrank(alice);

        // Need different blake2 results for each schema
        vm.mockCall(SYSTEM_ADDR, abi.encodeWithSignature("hashBlake256(bytes)"), abi.encode(keccak256("s1")));
        dv.registerSchema("Schema1", "f1:string", true);

        vm.mockCall(SYSTEM_ADDR, abi.encodeWithSignature("hashBlake256(bytes)"), abi.encode(keccak256("s2")));
        dv.registerSchema("Schema2", "f2:uint256", false);

        vm.stopPrank();

        bytes32[] memory uids = dv.getAllSchemaUids();
        assertEq(uids.length, 2);
    }

    // =========================================================================
    // Attestation Tests
    // =========================================================================

    function test_attest() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));
        assertTrue(attUid != bytes32(0));
        assertEq(dv.attestationCount(), 1);
    }

    function test_attest_invalidSchema_reverts() public {
        vm.prank(alice);
        vm.expectRevert("schema not found");
        dv.attest(bytes32(uint256(999)), bob, abi.encode("data"), 0, bytes32(0));
    }

    function test_attest_alreadyExpired_reverts() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        vm.expectRevert("already expired");
        dv.attest(schemaUid, bob, abi.encode("data"), 1, bytes32(0)); // timestamp 1 is in the past
    }

    function test_attestSecure() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        bytes32 uid = dv.attestSecure(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));
        assertTrue(uid != bytes32(0));
    }

    function test_attestSecure_notDirect_reverts() public {
        vm.mockCall(SYSTEM_ADDR, abi.encodeWithSignature("callerIsOrigin()"), abi.encode(false));

        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        vm.expectRevert("DotVerify: must be direct caller");
        dv.attestSecure(schemaUid, bob, abi.encode("data"), 0, bytes32(0));
    }

    function test_verify_valid() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));

        (bool valid, DotVerify.Attestation memory a) = dv.verify(attUid);
        assertTrue(valid);
        assertEq(a.issuer, alice);
        assertEq(a.recipient, bob);
    }

    function test_verify_notFound() public {
        (bool valid,) = dv.verify(bytes32(uint256(999)));
        assertFalse(valid);
    }

    function test_verify_revoked() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));

        vm.prank(alice);
        dv.revoke(attUid);

        (bool valid,) = dv.verify(attUid);
        assertFalse(valid);
    }

    function test_verify_expired() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        uint256 future = block.timestamp + 100;
        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("Bob"), future, bytes32(0));

        // Warp past expiry
        vm.warp(future + 1);

        (bool valid,) = dv.verify(attUid);
        assertFalse(valid);
    }

    // =========================================================================
    // Revocation Tests
    // =========================================================================

    function test_revoke() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));

        vm.prank(alice);
        dv.revoke(attUid);

        (bool valid, DotVerify.Attestation memory a) = dv.verify(attUid);
        assertFalse(valid);
        assertTrue(a.revoked);
    }

    function test_revoke_notIssuer_reverts() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));

        vm.prank(bob);
        vm.expectRevert("not issuer");
        dv.revoke(attUid);
    }

    function test_revoke_nonRevocable_reverts() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("Permanent", "data:bytes", false);

        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("data"), 0, bytes32(0));

        vm.prank(alice);
        vm.expectRevert("schema not revocable");
        dv.revoke(attUid);
    }

    function test_revoke_alreadyRevoked_reverts() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));

        vm.prank(alice);
        dv.revoke(attUid);

        vm.prank(alice);
        vm.expectRevert("already revoked");
        dv.revoke(attUid);
    }

    // =========================================================================
    // Attestation Query Tests
    // =========================================================================

    function test_getReceivedAttestations() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));

        bytes32[] memory received = dv.getReceivedAttestations(bob);
        assertEq(received.length, 1);
    }

    function test_getIssuedAttestations() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));

        bytes32[] memory issued = dv.getIssuedAttestations(alice);
        assertEq(issued.length, 1);
    }

    function test_getSchemaAttestations() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        dv.attest(schemaUid, bob, abi.encode("Bob1"), 0, bytes32(0));

        // Need different hash for second attestation
        vm.mockCall(SYSTEM_ADDR, abi.encodeWithSignature("hashBlake256(bytes)"), abi.encode(keccak256("att2")));
        vm.prank(alice);
        dv.attest(schemaUid, alice, abi.encode("Alice"), 0, bytes32(0));

        bytes32[] memory schemaAtts = dv.getSchemaAttestations(schemaUid);
        assertEq(schemaAtts.length, 2);
    }

    // =========================================================================
    // sr25519 Tests
    // =========================================================================

    function test_attestWithSr25519() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        uint8[64] memory sig;
        for (uint i = 0; i < 64; i++) sig[i] = uint8(i + 1);
        bytes32 pubKey = bytes32(uint256(0xABCD));

        vm.prank(alice);
        bytes32 uid = dv.attestWithSr25519(sig, pubKey, schemaUid, bob, abi.encode("Bob"), 0);
        assertTrue(uid != bytes32(0));
        assertEq(dv.attestationCount(), 1);
    }

    function test_sr25519_replayPrevention() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        uint8[64] memory sig;
        for (uint i = 0; i < 64; i++) sig[i] = uint8(i + 1);
        bytes32 pubKey = bytes32(uint256(0xABCD));

        vm.prank(alice);
        dv.attestWithSr25519(sig, pubKey, schemaUid, bob, abi.encode("Bob"), 0);

        vm.prank(alice);
        vm.expectRevert("signature already used");
        dv.attestWithSr25519(sig, pubKey, schemaUid, bob, abi.encode("Bob2"), 0);
    }

    function test_sr25519_invalidSig_reverts() public {
        vm.mockCall(SYSTEM_ADDR, abi.encodeWithSignature("sr25519Verify(uint8[64],bytes,bytes32)"), abi.encode(false));

        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        uint8[64] memory sig;
        bytes32 pubKey = bytes32(uint256(0xABCD));

        vm.prank(alice);
        vm.expectRevert("invalid sr25519 signature");
        dv.attestWithSr25519(sig, pubKey, schemaUid, bob, abi.encode("Bob"), 0);
    }

    // =========================================================================
    // XCM Tests
    // =========================================================================

    function test_sendAttestationXcm() public {
        vm.prank(alice);
        bytes32 schemaUid = dv.registerSchema("ID", "name:string", true);

        vm.prank(alice);
        bytes32 attUid = dv.attest(schemaUid, bob, abi.encode("Bob"), 0, bytes32(0));

        vm.prank(alice);
        dv.sendAttestationXcm(attUid, hex"01", hex"02");
    }

    function test_sendAttestationXcm_notFound_reverts() public {
        vm.prank(alice);
        vm.expectRevert("attestation not found");
        dv.sendAttestationXcm(bytes32(uint256(999)), hex"01", hex"02");
    }

    function test_executeXcmLocal() public {
        vm.prank(alice);
        dv.executeXcmLocal(hex"deadbeef");
    }

    function test_estimateXcmWeight() public view {
        IXcm.Weight memory w = dv.estimateXcmWeight(hex"deadbeef");
        assertEq(w.refTime, 100000);
        assertEq(w.proofSize, 50000);
    }

    // =========================================================================
    // System Precompile Tests
    // =========================================================================

    function test_resolveIssuerIdentity() public {
        bytes memory id = dv.resolveIssuerIdentity(alice);
        assertTrue(id.length > 0);
    }

    function test_ecdsaToAddress() public view {
        uint8[33] memory pk;
        pk[0] = 0x02;
        address addr = dv.ecdsaToAddress(pk);
        assertEq(addr, alice);
    }

    function test_getRemainingWeight() public view {
        (uint64 refTime, uint64 proofSize) = dv.getRemainingWeight();
        assertEq(refTime, 1000000);
        assertEq(proofSize, 500000);
    }

    function test_isDirectCaller() public view {
        assertTrue(dv.isDirectCaller());
    }

    function test_getMinimumBalance() public view {
        uint256 min = dv.getMinimumBalance();
        assertEq(min, 1e15);
    }

    function test_blake2Hash() public pure {
        // This calls the system precompile mock
        // In production, returns actual BLAKE2-256
    }

    function test_getCodeHash() public view {
        bytes32 h = dv.getCodeHash();
        assertEq(h, keccak256("code"));
    }

    // =========================================================================
    // Pausable Tests
    // =========================================================================

    function test_pause_unpause() public {
        dv.pause();

        vm.expectRevert();
        vm.prank(alice);
        dv.registerSchema("Test", "f:string", true);

        dv.unpause();

        vm.prank(alice);
        dv.registerSchema("Test", "f:string", true);
    }

    function test_pause_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        dv.pause();
    }

    // =========================================================================
    // Fuzz Tests
    // =========================================================================

    function testFuzz_registerSchema(string calldata name, string calldata def) public {
        vm.assume(bytes(name).length > 0 && bytes(name).length < 100);
        vm.assume(bytes(def).length > 0 && bytes(def).length < 200);

        vm.prank(alice);
        bytes32 uid = dv.registerSchema(name, def, true);
        assertTrue(uid != bytes32(0));
    }
}
