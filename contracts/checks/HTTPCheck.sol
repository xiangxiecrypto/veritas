// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../mocks/IPrimusZKTLS.sol";
import "../interfaces/ICheck.sol";

/**
 * @title HTTPCheck
 * @notice Check contract for HTTP API calls
 * @dev Validates HTTP request/response from Primus attestation
 */
contract HTTPCheck is ICheck {
    
    struct HTTPCheckData {
        string expectedUrl;
        string expectedMethod;
        uint256 minResponseCode;
        uint256 maxResponseCode;
        bytes expectedDataPattern;
        bool validateParsePath;
    }
    
    function validate(
        bytes calldata attestationData,
        bytes calldata checkData
    ) external pure override returns (bool passed) {
        
        IPrimusZKTLS.Attestation memory attestation = abi.decode(
            attestationData,
            (IPrimusZKTLS.Attestation)
        );
        
        HTTPCheckData memory data = abi.decode(checkData, (HTTPCheckData));
        
        // 1. Validate URL
        if (!_matchUrl(attestation.request.url, data.expectedUrl)) {
            return false;
        }
        
        // 2. Validate method
        if (!_matchMethod(attestation.request.method, data.expectedMethod)) {
            return false;
        }
        
        // 3. Validate parsePath if required
        if (data.validateParsePath) {
            if (!_validateParsePath(attestation)) {
                return false;
            }
        }
        
        // 4. Validate data pattern if specified
        if (data.expectedDataPattern.length > 0) {
            if (!_matchPattern(bytes(attestation.data), data.expectedDataPattern)) {
                return false;
            }
        }
        
        return true;
    }
    
    function _validateParsePath(IPrimusZKTLS.Attestation memory attestation) 
        internal 
        pure 
        returns (bool) 
    {
        for (uint256 i = 0; i < attestation.reponseResolve.length; i++) {
            IPrimusZKTLS.AttNetworkResponseResolve memory resolve = attestation.reponseResolve[i];
            
            if (bytes(resolve.parsePath).length == 0) {
                return false;
            }
            
            if (!_isValidParseType(resolve.parseType)) {
                return false;
            }
            
            if (bytes(resolve.keyName).length == 0) {
                return false;
            }
        }
        
        return true;
    }
    
    function _isValidParseType(string memory parseType) 
        internal 
        pure 
        returns (bool) 
    {
        bytes32 parseTypeHash = keccak256(bytes(parseType));
        
        return (parseTypeHash == keccak256("JSON") ||
                parseTypeHash == keccak256("HTML") ||
                parseTypeHash == keccak256("XML") ||
                parseTypeHash == keccak256("TEXT"));
    }
    
    function _matchUrl(
        string memory url, 
        string memory pattern
    ) internal pure returns (bool) {
        bytes memory urlBytes = bytes(url);
        bytes memory patternBytes = bytes(pattern);
        
        if (patternBytes.length == 1 && patternBytes[0] == '*') {
            return true;
        }
        
        if (keccak256(urlBytes) == keccak256(patternBytes)) {
            return true;
        }
        
        if (patternBytes.length > 0 && 
            patternBytes[patternBytes.length - 1] == '*') {
            
            bytes memory prefix = new bytes(patternBytes.length - 1);
            for (uint i = 0; i < prefix.length; i++) {
                prefix[i] = patternBytes[i];
            }
            
            if (urlBytes.length >= prefix.length) {
                bool isMatch = true;
                for (uint i = 0; i < prefix.length; i++) {
                    if (urlBytes[i] != prefix[i]) {
                        isMatch = false;
                        break;
                    }
                }
                return isMatch;
            }
        }
        
        return false;
    }
    
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
    
    function _matchPattern(
        bytes memory data, 
        bytes memory pattern
    ) internal pure returns (bool) {
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
    
    function _toUpper(bytes1 b) internal pure returns (bytes1) {
        if (b >= 0x61 && b <= 0x7A) {
            return bytes1(uint8(b) - 32);
        }
        return b;
    }
}
