// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/DotVerify.sol";

contract DeployDotVerify is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        DotVerify dv = new DotVerify();
        console.log("DotVerify deployed at:", address(dv));

        vm.stopBroadcast();
    }
}
