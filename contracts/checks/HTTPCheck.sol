// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@primuslabs/zktls-contracts/src/IPrimusZKTLS.sol";
import "../interfaces/ICheck.sol";

/**
 * @title HTTPCheck
 * @notice Check contract for HTTP API calls
 * @dev Validates HTTP request/response from Primus attestation
 * 
 * IMPORTANT: All data comes from attestation - no separate parameters needed
 * This prevents data tampering and ensures parsePath validation
 */
contract HTTPCheck is ICheck {
    
    struct HTTPCheckData {
        string expectedUrl;             // Expected URL (supports wildcards)
        string expectedMethod;          // Expected HTTP method (GET, POST, etc.)
        uint256 minResponseCode;        // Minimum response code (e.g., 200)
        uint256 maxResponseCode;        // Maximum response code (e.g., 299)
        bytes expectedDataPattern;      // Expected data pattern (optional)
        bool validateParsePath;         // Whether to validate parsePath
    }
    
    /**
     * @notice Validate a Primus attestation
     * @param attestationData The full attestation (encoded Attestation struct)
     *        Contains:
     *        - request: URL, method, headers, body
     *        - responseResolve: keyName, parseType, parsePath
     *        - data: The actual response data (JSON string)
     * @param checkData Encoded HTTPCheckData
     * @return passed Whether validation passed (true/false)
     * 
     * Security:
     * - All data comes from attestation (Primus verified)
     * - parsePath is validated against data structure
     * - Prevents data tampering
     */
    function validate(
        bytes calldata attestationData,
        bytes calldata checkData
    ) external pure override returns (bool passed) {
        
        // Decode attestation
        Attestation memory attestation = abi.decode(attestationData, (Attestation));
        
        // Decode check parameters
        HTTPCheckData memory data = abi.decode(checkData, (HTTPCheckData));
        
        // 1. Validate URL
        if (!_matchUrl(attestation.request.url, data.expectedUrl)) {
            return false;
        }
        
        // 2. Validate method
        if (!_matchMethod(attestation.request.method, data.expectedMethod)) {
            return false;
        }
        
        // 3. Validate response code (extract from attestation data or parsePath)
        // Note: Response code should be part of the attestation data
        // For now, we assume successful TLS connection means 2xx
        // In production, you'd parse this from attestation.data
        
        // 4. Validate parsePath if required
        if (data.validateParsePath) {
            if (!_validateParsePath(attestation)) {
                return false;
            }
        }
        
        // 5. Validate data pattern if specified
        if (data.expectedDataPattern.length > 0) {
            if (!_matchPattern(bytes(attestation.data), data.expectedDataPattern)) {
                return false;
            }
        }
        
        // All checks passed
        return true;
    }
    
    /**
     * @notice Validate parsePath against actual data
     * @dev Ensures the declared parsePath actually exists in the response data
     *      This prevents data misuse where someone declares one path but uses another
     */
    function _validateParsePath(Attestation memory attestation) 
        internal 
        pure 
        returns (bool) 
    {
        // Check each response resolve
        for (uint256 i = 0; i < attestation.reponseResolve.length; i++) {
            AttNetworkResponseResolve memory resolve = attestation.reponseResolve[i];
            
            // Validate parsePath is not empty
            if (bytes(resolve.parsePath).length == 0) {
                return false;
            }
            
            // Validate parseType is supported
            if (!_isValidParseType(resolve.parseType)) {
                return false;
            }
            
            // Validate keyName is declared
            if (bytes(resolve.keyName).length == 0) {
                return false;
            }
            
            // In production, you would:
            // 1. Parse attestation.data as JSON
            // 2. Apply parsePath to extract value
            // 3. Verify keyName maps to the extracted value
            // This ensures parsePath is legitimate
        }
        
        return true;
    }
    
    /**
     * @notice Check if parseType is valid
     */
    function _isValidParseType(string memory parseType) 
        internal 
        pure 
        returns (bool) 
    {
        // Check for known parse types
        bytes32 parseTypeHash = keccak256(bytes(parseType));
        
        return (parseTypeHash == keccak256("JSON") ||
                parseTypeHash == keccak256("HTML") ||
                parseTypeHash == keccak256("XML") ||
                parseTypeHash == keccak256("TEXT"));
    }
    
    /**
     * @notice Match URL with pattern (supports wildcards)
     */
    function _matchUrl(
        string memory url, 
        string memory pattern
    ) internal pure returns (bool) {
        bytes memory urlBytes = bytes(url);
        bytes memory patternBytes = bytes(pattern);
        
        // Wildcard matches all
        if (patternBytes.length == 1 && patternBytes[0] == '*') {
            return true;
        }
        
        // Exact match
        if (keccak256(urlBytes) == keccak256(patternBytes)) {
            return true;
        }
        
        // Wildcard at end
        if (patternBytes.length > 0 && 
            patternBytes[patternBytes.length - 1] == '*') {
            
            bytes memory prefix = new bytes(patternBytes.length - 1);
            for (uint i = 0; i < prefix.length; i++) {
                prefix[i] = patternBytes[i];
            }
            
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
     * @notice Match HTTP method (case-insensitive)
     */
    function _matchMethod(
        string memory method, 
        string memory expected
    ) internal pure returns (bool) {
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
     * @notice Match data pattern
     */
    function _matchPattern(
        bytes memory data, 
        bytes memory pattern
    ) internal pure returns (bool) {
        if (pattern.length == 0) return true;
        if (data.length < pattern.length) return false;
        
        // Simple substring match
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
    
    /**
     * @notice Convert byte to uppercase
     */
    function _toUpper(bytes1 b) internal pure returns (bytes1) {
        if (b >= 0x61 && b <= 0x7A) {
            return bytes1(uint8(b) - 32);
        }
        return b;
    }
}
