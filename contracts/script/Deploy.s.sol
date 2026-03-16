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

        // Register demo schemas
        bytes32 idSchema = dv.registerSchema(
            "BasicIdentity",
            "name:string,email:string,verified:bool",
            true
        );
        console.log("BasicIdentity schema UID:");
        console.logBytes32(idSchema);

        bytes32 diplomaSchema = dv.registerSchema(
            "AcademicDiploma",
            "name:string,institution:string,degree:string,graduationDate:uint256,gpa:string",
            false
        );
        console.log("AcademicDiploma schema UID:");
        console.logBytes32(diplomaSchema);

        bytes32 certSchema = dv.registerSchema(
            "ProfessionalCertification",
            "name:string,certName:string,issuer:string,issueDate:uint256,expiryDate:uint256",
            true
        );
        console.log("ProfessionalCertification schema UID:");
        console.logBytes32(certSchema);

        vm.stopBroadcast();
    }
}
