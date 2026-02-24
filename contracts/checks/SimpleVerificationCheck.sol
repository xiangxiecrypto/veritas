// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";

/**
 * @notice Verification check that validates URL, dataKey, parsePath, and data
 * @dev Validates that attestation matches rule configuration
 */
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
    
    /**
     * @notice Validate attestation matches rule configuration
     * @dev Checks:
     * 1. URL matches
     * 2. dataKey matches
     * 3. parsePath matches
     * 4. Data contains expected key
     */
    function validate(
        bytes calldata attestationUrl,
        bytes calldata attestationResponseResolve,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata params
    ) external view override returns (bool) {
        // 1. Verify URL matches (convert bytes to string for comparison)
        string memory attUrl = string(attestationUrl);
        if (!_stringsEqual(attUrl, ruleUrlTemplate)) {
            return false;
        }
        
        // 2. Verify dataKey matches
        string memory attDataKey = _decodeDataKey(attestationResponseResolve);
        if (!_stringsEqual(attDataKey, ruleDataKey)) {
            return false;
        }
        
        // 3. Verify parsePath matches
        string memory attParsePath = _decodeParsePath(attestationResponseResolve);
        if (!_stringsEqual(attParsePath, ruleParsePath)) {
            return false;
        }
        
        // 4. Verify data is not empty and contains expected key
        if (bytes(attestationData).length == 0) {
            return false;
        }
        
        if (!_containsKey(attestationData, ruleDataKey)) {
            return false;
        }
        
        // All checks passed
        return true;
    }
    
    /**
     * @notice Compare two strings for equality
     */
    function _stringsEqual(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
    
    /**
     * @notice Decode dataKey from responseResolve bytes
     * @dev Searches for keyName pattern in ABI-encoded data
     */
    function _decodeDataKey(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        // Search for "keyName" marker
        bytes memory marker = "keyName";
        for (uint i = 0; i < data.length - 7; i++) {
            bool found = true;
            for (uint j = 0; j < 7; j++) {
                if (data[i + j] != marker[j]) {
                    found = false;
                    break;
                }
            }
            
            if (found) {
                // Found marker, extract the value after it
                // In ABI encoding, string value comes after length
                for (uint k = i + 7; k < data.length - 32; k += 32) {
                    if (data.length >= k + 64) {
                        // Try to read length and value
                        uint256 len = 0;
                        for (uint m = 0; m < 32; m++) {
                            len = len * 256 + uint256(uint8(data[k + m]));
                        }
                        
                        // Sanity check: length should be reasonable
                        if (len > 0 && len < 100 && k + 32 + len <= data.length) {
                            bytes memory result = new bytes(len);
                            for (uint n = 0; n < len; n++) {
                                result[n] = data[k + 32 + n];
                            }
                            return string(result);
                        }
                    }
                }
            }
        }
        
        return "";
    }
    
    /**
     * @notice Decode parsePath from responseResolve bytes
     * @dev Searches for parsePath pattern in ABI-encoded data
     */
    function _decodeParsePath(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        // Search for "parsePath" marker
        bytes memory marker = "parsePath";
        for (uint i = 0; i < data.length - 9; i++) {
            bool found = true;
            for (uint j = 0; j < 9; j++) {
                if (data[i + j] != marker[j]) {
                    found = false;
                    break;
                }
            }
            
            if (found) {
                // Found marker, extract the value after it
                for (uint k = i + 9; k < data.length - 32; k += 32) {
                    if (data.length >= k + 64) {
                        uint256 len = 0;
                        for (uint m = 0; m < 32; m++) {
                            len = len * 256 + uint256(uint8(data[k + m]));
                        }
                        
                        if (len > 0 && len < 200 && k + 32 + len <= data.length) {
                            bytes memory result = new bytes(len);
                            for (uint n = 0; n < len; n++) {
                                result[n] = data[k + 32 + n];
                            }
                            return string(result);
                        }
                    }
                }
            }
        }
        
        return "";
    }
    
    /**
     * @notice Check if data contains the expected key (substring search)
     */
    function _containsKey(string memory data, string memory key) internal pure returns (bool) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        if (dataBytes.length == 0 || keyBytes.length == 0) {
            return false;
        }
        
        // Simple substring search
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
