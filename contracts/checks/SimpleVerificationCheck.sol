// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";

contract SimpleVerificationCheck is ICustomCheck {
    
    // Fallback to handle any unknown calls
    receive() external payable {
        // Just receive ETH
    }
    
    fallback() external payable {
        // Return true for any unknown function calls
        assembly {
            mstore(0, 1) // Store true (1) in memory
            return(0, 32) // Return 32 bytes
        }
    }
    
    function validate(
        bytes calldata attestationUrl,
        bytes calldata attestationResponseResolve,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata params
    ) external view override returns (bool) {
        return true;
    }
}
