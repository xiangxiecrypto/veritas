// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";
import "../IPrimus.sol";

/**
 * @notice Verification check using official Primus attestation structure
 * @dev Validates URL, dataKey, parsePath from on-chain attestation
 */
contract SimpleVerificationCheck is ICustomCheck {
    
    /**
     * @notice Validate attestation matches rule configuration
     * @param request Encoded AttNetworkRequest[] array
     * @param responseResolves Encoded AttNetworkOneUrlResponseResolve[] array
     * @param attestationData The extracted data value from attestation
     * @param ruleUrlTemplate Expected URL template
     * @param ruleDataKey Expected dataKey
     * @param ruleParsePath Expected parsePath
     * @return passed Whether the check passed
     */
    function validate(
        bytes calldata request,
        bytes calldata responseResolves,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata /* params */
    ) external pure override returns (bool) {
        // 1. Decode request array
        AttNetworkRequest[] memory requests = abi.decode(request, (AttNetworkRequest[]));
        
        // Verify request array is not empty
        if (requests.length == 0) {
            return false;
        }
        
        // 2. Check URL: hash(request[0].url) == hash(ruleUrlTemplate)
        if (keccak256(bytes(requests[0].url)) != keccak256(bytes(ruleUrlTemplate))) {
            return false;
        }
        
        // 3. Decode responseResolves array
        AttNetworkOneUrlResponseResolve[] memory resolves = abi.decode(responseResolves, (AttNetworkOneUrlResponseResolve[]));
        
        // Verify responseResolves array is not empty
        if (resolves.length == 0 || resolves[0].oneUrlResponseResolve.length == 0) {
            return false;
        }
        
        // 4. Check dataKey: responseResolve[0].keyName == ruleDataKey
        if (keccak256(bytes(resolves[0].oneUrlResponseResolve[0].keyName)) != keccak256(bytes(ruleDataKey))) {
            return false;
        }
        
        // 5. Check parsePath: hash(responseResolve[0].parsePath) == hash(ruleParsePath)
        if (keccak256(bytes(resolves[0].oneUrlResponseResolve[0].parsePath)) != keccak256(bytes(ruleParsePath))) {
            return false;
        }
        
        // 6. Verify data contains expected key
        if (!_containsKey(attestationData, ruleDataKey)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Check if data contains key
     */
    function _containsKey(string memory data, string memory key) internal pure returns (bool) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        if (dataBytes.length == 0 || keyBytes.length == 0) {
            return false;
        }
        
        // Substring search
        for (uint i = 0; i <= dataBytes.length - keyBytes.length; i++) {
            bool matched = true;
            for (uint j = 0; j < keyBytes.length; j++) {
                if (dataBytes[i + j] != keyBytes[j]) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                return true;
            }
        }
        
        return false;
    }
}
