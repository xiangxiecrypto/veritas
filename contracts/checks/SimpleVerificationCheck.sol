// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";

contract SimpleVerificationCheck is ICustomCheck {
    
    struct ResponseResolve {
        string keyName;
        string parseType;
        string parsePath;
        string op;
        string value;
    }
    
    function validate(
        bytes calldata attestationUrl,
        bytes calldata attestationResponseResolve,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata
    ) external pure override returns (bool) {
        // 1. Verify URL matches template
        string memory attUrl = string(attestationUrl);
        if (!_urlMatchesTemplate(attUrl, ruleUrlTemplate)) {
            return false;
        }
        
        // 2. Decode responseResolve and verify dataKey + parsePath
        ResponseResolve memory resolve = abi.decode(attestationResponseResolve, (ResponseResolve));
        
        // Verify dataKey matches
        if (keccak256(bytes(resolve.keyName)) != keccak256(bytes(ruleDataKey))) {
            return false;
        }
        
        // Verify parsePath matches
        if (keccak256(bytes(resolve.parsePath)) != keccak256(bytes(ruleParsePath))) {
            return false;
        }
        
        // 3. Verify attestationData is not empty and valid JSON
        if (bytes(attestationData).length == 0) {
            return false;
        }
        
        // All checks passed
        return true;
    }
    
    function _urlMatchesTemplate(
        string memory attestationUrl,
        string memory template
    ) internal pure returns (bool) {
        bytes memory urlBytes = bytes(attestationUrl);
        bytes memory templateBytes = bytes(template);
        
        // Find * placeholder
        uint256 placeholderPos = _indexOf(templateBytes, "*");
        if (placeholderPos >= templateBytes.length) {
            // No placeholder - must match exactly
            return keccak256(urlBytes) == keccak256(templateBytes);
        }
        
        // URL must be at least as long as template (accounting for entity replacing *)
        if (urlBytes.length < templateBytes.length - 1) {
            return false;
        }
        
        // Verify prefix matches
        for (uint256 i = 0; i < placeholderPos; i++) {
            if (urlBytes[i] != templateBytes[i]) {
                return false;
            }
        }
        
        // Verify suffix matches
        uint256 suffixLen = templateBytes.length - placeholderPos - 1;
        uint256 urlSuffixStart = urlBytes.length - suffixLen;
        
        for (uint256 i = 0; i < suffixLen; i++) {
            if (urlBytes[urlSuffixStart + i] != templateBytes[placeholderPos + 1 + i]) {
                return false;
            }
        }
        
        return true;
    }
    
    function _indexOf(
        bytes memory haystack,
        bytes memory needle
    ) internal pure returns (uint256) {
        if (needle.length == 0) return 0;
        if (haystack.length < needle.length) return type(uint256).max;
        
        for (uint256 i = 0; i <= haystack.length - needle.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return i;
        }
        
        return type(uint256).max;
    }
}
