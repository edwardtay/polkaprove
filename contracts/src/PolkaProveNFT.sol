// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IPolkaProve {
    function soulboundTokens(uint256 tokenId) external view returns (
        address holder, bytes32 anchorId, string memory credentialType, uint256 mintedAt
    );
    function sbtNextId() external view returns (uint256);
    function getHolderTokens(address holder) external view returns (uint256[] memory);
}

contract PolkaProveNFT {
    IPolkaProve public immutable polkaProve;
    string public constant name = "PolkaProve Credential";
    string public constant symbol = "PPROVE";
    string public baseURI;
    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(address _polkaProve, string memory _baseURI) {
        polkaProve = IPolkaProve(_polkaProve);
        baseURI = _baseURI;
        owner = msg.sender;
    }

    function setBaseURI(string memory _baseURI) external {
        require(msg.sender == owner, "not owner");
        baseURI = _baseURI;
    }

    function totalSupply() external view returns (uint256) {
        return polkaProve.sbtNextId();
    }

    function balanceOf(address _owner) external view returns (uint256) {
        return polkaProve.getHolderTokens(_owner).length;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        (address holder,,,) = polkaProve.soulboundTokens(tokenId);
        require(holder != address(0), "nonexistent");
        return holder;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        (address holder,,,) = polkaProve.soulboundTokens(tokenId);
        require(holder != address(0), "nonexistent");
        return string(abi.encodePacked(baseURI, _toString(tokenId)));
    }

    function register(uint256 tokenId) external {
        (address holder,,,) = polkaProve.soulboundTokens(tokenId);
        require(holder != address(0), "nonexistent");
        emit Transfer(address(0), holder, tokenId);
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 d; uint256 t = v;
        while (t != 0) { d++; t /= 10; }
        bytes memory b = new bytes(d);
        while (v != 0) { d--; b[d] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }

    function transferFrom(address, address, uint256) external pure { revert("SOULBOUND"); }
    function safeTransferFrom(address, address, uint256) external pure { revert("SOULBOUND"); }
    function approve(address, uint256) external pure { revert("SOULBOUND"); }
}
