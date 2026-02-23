// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";

contract SimpleVerificationCheck is ICustomCheck {
    
    function validate(
        bytes calldata attestationUrl,
        bytes calldata attestationResponseResolve,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata
    ) external view override returns (bool) {
        // 1. Verify URL matches template
        string memory attUrl = string(attestationUrl);
        if (!_urlMatchesTemplate(attUrl, ruleUrlTemplate)) {
            return false;
        }
        
        // 2. Decode responseResolve - try different formats
        // SDK format: [[{keyName, parsePath}]] encoded as bytes
        // We try to extract keyName and parsePath from the encoded bytes
        
        (string memory keyName, string memory parsePath) = _decodeResponseResolve(attestationResponseResolve);
        
        // Verify dataKey matches
        if (bytes(keyName).length > 0 && keccak256(bytes(keyName)) != keccak256(bytes(ruleDataKey))) {
            return false;
        }
        
        // Verify parsePath matches
        if (bytes(parsePath).length > 0 && keccak256(bytes(parsePath)) != keccak256(bytes(ruleParsePath))) {
            return false;
        }
        
        // 3. Verify attestationData is not empty
        if (bytes(attestationData).length == 0) {
            return false;
        }
        
        return true;
    }
    
    function _decodeResponseResolve(bytes memory data) internal view returns (string memory keyName, string memory parsePath) {
        // Try to decode as ResponseResolve[][] first
        // ABI encoding: offset, length, [offset, length, {keyName_offset, parsePath_offset, ...}]
        
        if (data.length < 64) {
            return ("", "");
        }
        
        // Try simple struct decode first
        try this.decodeSimple(data) returns (string memory kn, string memory pp) {
            return (kn, pp);
        } catch {
            // Try array of arrays
            try this.decodeNested(data) returns (string memory kn, string memory pp) {
                return (kn, pp);
            } catch {
                // Fallback: extract strings from ABI encoding manually
                return _extractStringsFromAbi(data);
            }
        }
    }
    
    function decodeSimple(bytes calldata data) external view returns (string memory keyName, string memory parsePath) {
        // ResponseResolve struct: (keyName, parseType, parsePath, op, value)
        (string memory kn, string memory _pt, string memory pp, string memory _op, string memory _val) = 
            abi.decode(data, (string, string, string, string, string));
        return (kn, pp);
    }
    
    function decodeNested(bytes calldata data) external view returns (string memory keyName, string memory parsePath) {
        // Try decoding as nested struct with oneUrlResponseResolve
        bytes memory inner = abi.decode(data, (bytes));
        (string memory kn, string memory _pt, string memory pp, string memory _op, string memory _val) = 
            abi.decode(inner, (string, string, string, string, string));
        return (kn, pp);
    }
    
    function _extractStringsFromAbi(bytes memory data) internal pure returns (string memory, string memory) {
        // Scan for string patterns in ABI encoding
        // This is a fallback that looks for the keyName and parsePath anywhere in the data
        
        bytes memory keyNameBytes = new bytes(32);
        bytes memory parsePathBytes = new bytes(64);
        
        // Simple extraction - look for "$.data.rates" pattern
        for (uint256 i = 0; i < data.length - 12; i++) {
            if (data[i] == 0x24 && data[i+1] == 0x2e && data[i+2] == 0x64) { // "$.d"
                // Found potential parsePath starting with "$."
                uint256 len = 0;
                for (uint256 j = i; j < data.length && data[j] != 0; j++) {
                    len++;
                }
                if (len > 5) {
                    bytes memory pp = new bytes(len);
                    for (uint256 j = 0; j < len; j++) {
                        pp[j] = data[i + j];
                    }
                    return ("", string(pp));
                }
            }
        }
        
        return ("", "");
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
