// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ICustomCheck.sol";

/**
 * @title HTTPCheck
 * @notice HTTP validation check compatible with ICustomCheck
 */
contract HTTPCheck is ICustomCheck {
    
    struct HTTPCheckParams {
        string expectedMethod;
        bytes expectedDataPattern;
        bool validateParsePath;
        bool validateDataKey;
    }
    
    function validate(
        bytes calldata request,
        bytes calldata responseResolves,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata params
    ) external pure override returns (bool passed) {
        
        HTTPCheckParams memory checkParams = abi.decode(params, (HTTPCheckParams));
        
        // Decode request (simplified - only url and method)
        (string memory url, string memory method) = abi.decode(request, (string, string));
        
        // 1. URL pattern matching
        if (!matchUrl(url, ruleUrlTemplate)) {
            return false;
        }
        
        // 2. Method check
        if (!equalsIgnoreCase(method, checkParams.expectedMethod)) {
            return false;
        }
        
        // 3. Data pattern check
        if (checkParams.expectedDataPattern.length > 0) {
            if (!containsPattern(bytes(attestationData), checkParams.expectedDataPattern)) {
                return false;
            }
        }
        
        // 4. ParsePath validation - check if rule's expected parsePath is set
        if (checkParams.validateParsePath) {
            if (bytes(ruleParsePath).length == 0) {
                return false;
            }
        }
        
        // 5. DataKey validation - verify attestation has the expected key
        if (checkParams.validateDataKey) {
            if (bytes(ruleDataKey).length == 0) {
                return false;
            }
            // Check if attestation data contains the expected dataKey
            bytes memory keyPattern = abi.encodePacked('"', ruleDataKey, '"');
            if (!containsPattern(bytes(attestationData), keyPattern)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Helper functions
    function matchUrl(string memory url, string memory pattern) internal pure returns (bool) {
        bytes memory urlBytes = bytes(url);
        bytes memory patternBytes = bytes(pattern);
        
        if (patternBytes.length == 0) return true;
        if (keccak256(urlBytes) == keccak256(patternBytes)) return true;
        
        // Wildcard match (e.g., "https://api.binance.com/*")
        if (patternBytes.length > 0 && patternBytes[patternBytes.length - 1] == 0x2a) {
            if (urlBytes.length < patternBytes.length - 1) return false;
            for (uint i = 0; i < patternBytes.length - 1; i++) {
                if (urlBytes[i] != patternBytes[i]) return false;
            }
            return true;
        }
        return false;
    }
    
    function equalsIgnoreCase(string memory a, string memory b) internal pure returns (bool) {
        bytes memory aBytes = bytes(a);
        bytes memory bBytes = bytes(b);
        if (aBytes.length != bBytes.length) return false;
        for (uint i = 0; i < aBytes.length; i++) {
            if (toUpper(aBytes[i]) != toUpper(bBytes[i])) return false;
        }
        return true;
    }
    
    function containsPattern(bytes memory data, bytes memory pattern) internal pure returns (bool) {
        if (pattern.length == 0) return true;
        if (data.length < pattern.length) return false;
        for (uint i = 0; i <= data.length - pattern.length; i++) {
            bool found = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (data[i + j] != pattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }
    
    function toUpper(bytes1 b) internal pure returns (bytes1) {
        if (b >= 0x61 && b <= 0x7A) return bytes1(uint8(b) - 32);
        return b;
    }
}
