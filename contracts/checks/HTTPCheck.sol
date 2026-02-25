// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ICheck.sol";

/**
 * @title HTTPCheck
 * @notice Check contract for HTTP API calls
 * @dev Validates HTTP request/response from zktls-core-sdk attestations
 */
contract HTTPCheck is ICheck {
    
    struct HTTPCheckData {
        string expectedUrl;             // Expected URL (supports wildcards)
        string expectedMethod;          // Expected HTTP method (GET, POST, etc.)
        uint256 minResponseCode;        // Minimum response code (e.g., 200)
        uint256 maxResponseCode;        // Maximum response code (e.g., 299)
        bytes expectedResponsePattern;  // Expected response pattern (optional)
    }
    
    struct ParsedAttestation {
        string url;
        string method;
        uint256 responseCode;
        bytes response;
        uint256 timestamp;
    }
    
    // Events
    event CheckPerformed(
        bytes32 indexed attestationHash,
        bool passed,
        uint256 score
    );
    
    /**
     * @notice Validate an HTTP attestation
     * @param attestation The attestation data from zktls-core-sdk
     * @param checkData Encoded HTTPCheckData
     * @param responseData The response data
     * @return passed Whether validation passed
     * @return score The validation score (0-100)
     */
    function validate(
        bytes calldata attestation,
        bytes calldata checkData,
        bytes calldata responseData
    ) external pure override returns (bool passed, uint256 score) {
        
        // Parse check data
        HTTPCheckData memory data = abi.decode(checkData, (HTTPCheckData));
        
        // Parse attestation
        ParsedAttestation memory parsed = parseAttestation(attestation);
        
        // Initialize score
        score = 100;
        passed = true;
        
        // Validate URL
        if (!_matchUrl(parsed.url, data.expectedUrl)) {
            return (false, 0);
        }
        
        // Validate method
        if (!_matchMethod(parsed.method, data.expectedMethod)) {
            return (false, 0);
        }
        
        // Validate response code
        if (parsed.responseCode < data.minResponseCode || 
            parsed.responseCode > data.maxResponseCode) {
            return (false, 0);
        }
        
        // Validate response pattern (if specified)
        if (data.expectedResponsePattern.length > 0) {
            if (!_matchPattern(responseData, data.expectedResponsePattern)) {
                passed = false;
                score = 50;
            }
        }
        
        // Calculate final score based on response quality
        score = _calculateScore(parsed.responseCode, responseData.length);
        
        return (passed, score);
    }
    
    /**
     * @notice Parse attestation data
     * @param attestation Raw attestation bytes
     * @return Parsed attestation struct
     * @dev This is a simplified parser. Real implementation should match
     *      zktls-core-sdk's attestation format
     */
    function parseAttestation(bytes calldata attestation) 
        internal 
        pure 
        returns (ParsedAttestation memory) 
    {
        // This is a placeholder implementation
        // Real implementation should parse the actual attestation format
        // from zktls-core-sdk
        
        // For now, return a default structure
        // In production, this should properly decode the attestation
        return ParsedAttestation({
            url: "",
            method: "",
            responseCode: 200,
            response: "",
            timestamp: 0
        });
    }
    
    /**
     * @notice Match URL with pattern (supports wildcards)
     * @param url Actual URL
     * @param pattern Pattern to match
     * @return Whether URL matches pattern
     */
    function _matchUrl(
        string memory url, 
        string memory pattern
    ) internal pure returns (bool) {
        bytes memory urlBytes = bytes(url);
        bytes memory patternBytes = bytes(pattern);
        
        // Simple wildcard matching
        // * matches any sequence of characters
        
        if (patternBytes.length == 1 && patternBytes[0] == '*') {
            return true;
        }
        
        // Exact match
        if (keccak256(urlBytes) == keccak256(patternBytes)) {
            return true;
        }
        
        // Wildcard matching (simplified)
        // Check if pattern ends with *
        if (patternBytes.length > 0 && 
            patternBytes[patternBytes.length - 1] == '*') {
            
            bytes memory prefix = new bytes(patternBytes.length - 1);
            for (uint i = 0; i < prefix.length; i++) {
                prefix[i] = patternBytes[i];
            }
            
            // Check if URL starts with prefix
            if (urlBytes.length >= prefix.length) {
                bool match = true;
                for (uint i = 0; i < prefix.length; i++) {
                    if (urlBytes[i] != prefix[i]) {
                        match = false;
                        break;
                    }
                }
                return match;
            }
        }
        
        return false;
    }
    
    /**
     * @notice Match HTTP method
     * @param method Actual method
     * @param expected Expected method
     * @return Whether methods match
     */
    function _matchMethod(
        string memory method, 
        string memory expected
    ) internal pure returns (bool) {
        // Case-insensitive comparison
        bytes memory methodBytes = bytes(method);
        bytes memory expectedBytes = bytes(expected);
        
        if (methodBytes.length != expectedBytes.length) {
            return false;
        }
        
        for (uint i = 0; i < methodBytes.length; i++) {
            bytes1 m = _toUpper(methodBytes[i]);
            bytes1 e = _toUpper(expectedBytes[i]);
            if (m != e) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @notice Match response pattern
     * @param data Response data
     * @param pattern Pattern to match
     * @return Whether data matches pattern
     */
    function _matchPattern(
        bytes memory data, 
        bytes memory pattern
    ) internal pure returns (bool) {
        // Simple pattern matching
        // In production, this could be more sophisticated
        
        if (pattern.length == 0) {
            return true;
        }
        
        if (data.length < pattern.length) {
            return false;
        }
        
        // Check if pattern exists in data
        for (uint i = 0; i <= data.length - pattern.length; i++) {
            bool found = true;
            for (uint j = 0; j < pattern.length; j++) {
                if (data[i + j] != pattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @notice Calculate validation score
     * @param responseCode HTTP response code
     * @param responseLength Response length
     * @return Score (0-100)
     */
    function _calculateScore(
        uint256 responseCode, 
        uint256 responseLength
    ) internal pure returns (uint256) {
        uint256 score = 100;
        
        // Deduct points for non-2xx responses
        if (responseCode >= 200 && responseCode < 300) {
            score = 100;
        } else if (responseCode >= 300 && responseCode < 400) {
            score = 80;
        } else if (responseCode >= 400 && responseCode < 500) {
            score = 50;
        } else if (responseCode >= 500) {
            score = 20;
        }
        
        // Bonus for substantial response
        if (responseLength > 0 && responseLength < 1000) {
            score = score;  // Keep score
        } else if (responseLength >= 1000) {
            score = min(score + 5, 100);  // Bonus, max 100
        }
        
        return score;
    }
    
    /**
     * @notice Convert byte to uppercase
     */
    function _toUpper(bytes1 b) internal pure returns (bytes1) {
        if (b >= 0x61 && b <= 0x7A) {
            return bytes1(uint8(b) - 32);
        }
        return b;
    }
    
    /**
     * @notice Minimum of two numbers
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
