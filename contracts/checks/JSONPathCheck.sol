// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ICustomCheck.sol";

/**
 * @title JSONPathCheck
 * @notice Advanced check contract with JSON path validation
 * @dev Supports multiple path patterns and nested key validation
 */
contract JSONPathCheck is ICustomCheck {
    
    struct JSONCheckParams {
        string expectedMethod;
        string requiredPrefix;      // JSON key prefix to check
        string requiredSuffix;      // JSON key suffix to check
        uint256 minDataLength;      // Minimum data length
        bool validateNestedPath;    // Whether to validate nested path structure
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
        
        JSONCheckParams memory checkParams = abi.decode(params, (JSONCheckParams));
        
        // Decode request (url and method)
        (string memory url, string memory method) = abi.decode(request, (string, string));
        
        // 1. URL pattern matching
        if (!matchUrl(url, ruleUrlTemplate)) {
            return false;
        }
        
        // 2. Method check
        if (!equalsIgnoreCase(method, checkParams.expectedMethod)) {
            return false;
        }
        
        // 3. Data length check
        if (checkParams.minDataLength > 0) {
            if (bytes(attestationData).length < checkParams.minDataLength) {
                return false;
            }
        }
        
        // 4. Required prefix check (e.g., "{\"price\"")
        if (bytes(checkParams.requiredPrefix).length > 0) {
            if (!startsWith(attestationData, checkParams.requiredPrefix)) {
                return false;
            }
        }
        
        // 5. Required suffix check
        if (bytes(checkParams.requiredSuffix).length > 0) {
            if (!endsWith(attestationData, checkParams.requiredSuffix)) {
                return false;
            }
        }
        
        // 6. ParsePath validation - check structure
        if (checkParams.validateNestedPath) {
            // Check if parsePath follows nested pattern like "$.data.price"
            if (!isValidNestedPath(ruleParsePath)) {
                return false;
            }
        }
        
        // 7. DataKey validation - ensure it's present in data
        if (bytes(ruleDataKey).length > 0) {
            bytes memory keyPattern = abi.encodePacked('"', ruleDataKey, '"');
            if (!containsPattern(bytes(attestationData), keyPattern)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Check if path is valid nested path (e.g., "$.data.price")
    function isValidNestedPath(string memory path) internal pure returns (bool) {
        bytes memory pathBytes = bytes(path);
        if (pathBytes.length < 3) return false;
        
        // Must start with "$"
        if (pathBytes[0] != 0x24) return false; // '$'
        
        // Must contain at least one "."
        bool hasDot = false;
        for (uint i = 1; i < pathBytes.length; i++) {
            if (pathBytes[i] == 0x2e) { // '.'
                hasDot = true;
                break;
            }
        }
        
        return hasDot;
    }
    
    function startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory prefixBytes = bytes(prefix);
        
        if (strBytes.length < prefixBytes.length) return false;
        
        for (uint i = 0; i < prefixBytes.length; i++) {
            if (strBytes[i] != prefixBytes[i]) return false;
        }
        return true;
    }
    
    function endsWith(string memory str, string memory suffix) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory suffixBytes = bytes(suffix);
        
        if (strBytes.length < suffixBytes.length) return false;
        
        uint strEnd = strBytes.length;
        uint suffixEnd = suffixBytes.length;
        
        for (uint i = 0; i < suffixBytes.length; i++) {
            if (strBytes[strEnd - suffixEnd + i] != suffixBytes[i]) return false;
        }
        return true;
    }
    
    // Helper functions (same as HTTPCheck)
    function matchUrl(string memory url, string memory pattern) internal pure returns (bool) {
        bytes memory urlBytes = bytes(url);
        bytes memory patternBytes = bytes(pattern);
        
        if (patternBytes.length == 0) return true;
        if (keccak256(urlBytes) == keccak256(patternBytes)) return true;
        
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
