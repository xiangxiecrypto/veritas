// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ThresholdCheck
 * @notice Validates that a value doesn't exceed a threshold percentage
 */
contract ThresholdCheck {
    struct ThresholdParams {
        int128 expectedValue;
        int128 maxDeviationBps;
    }

    function validate(
        string calldata dataKey,
        string calldata attestationData,
        bytes calldata params
    ) external pure returns (bool passed, int128 value) {
        ThresholdParams memory threshold = abi.decode(params, (ThresholdParams));
        value = _extractNestedValue(attestationData, dataKey);
        
        if (threshold.expectedValue == 0) {
            passed = (value == 0);
        } else {
            int128 diff = value > threshold.expectedValue 
                ? value - threshold.expectedValue 
                : threshold.expectedValue - value;
            
            int128 absExpected = threshold.expectedValue >= 0 
                ? threshold.expectedValue 
                : -threshold.expectedValue;
            
            int128 deviationBps = (diff * 10000) / absExpected;
            passed = (deviationBps <= threshold.maxDeviationBps);
        }
    }

    function _extractNestedValue(
        string calldata json,
        string calldata path
    ) internal pure returns (int128) {
        bytes memory jsonBytes = bytes(json);
        bytes memory pathBytes = bytes(path);
        
        uint256 jsonPos = 0;
        uint256 jsonLen = jsonBytes.length;
        uint256 pathStart = 0;
        uint256 pathLen = pathBytes.length;
        
        while (pathStart < pathLen) {
            uint256 segmentEnd = pathStart;
            while (segmentEnd < pathLen && pathBytes[segmentEnd] != '.') {
                segmentEnd++;
            }
            
            uint256 segmentLen = segmentEnd - pathStart;
            if (segmentLen == 0) break;
            
            bool keyFound = false;
            while (jsonPos < jsonLen - segmentLen - 2) {
                if (jsonBytes[jsonPos] != '"') {
                    jsonPos++;
                    continue;
                }
                
                bool isMatch = true;
                for (uint256 i = 0; i < segmentLen; i++) {
                    if (jsonBytes[jsonPos + 1 + i] != pathBytes[pathStart + i]) {
                        isMatch = false;
                        break;
                    }
                }
                
                if (isMatch && jsonBytes[jsonPos + 1 + segmentLen] == '"') {
                    jsonPos = jsonPos + 2 + segmentLen;
                    while (jsonPos < jsonLen && (jsonBytes[jsonPos] == ' ' || jsonBytes[jsonPos] == ':' || jsonBytes[jsonPos] == '\n')) {
                        jsonPos++;
                    }
                    keyFound = true;
                    break;
                }
                jsonPos++;
            }
            
            if (!keyFound) return 0;
            pathStart = segmentEnd + 1;
        }
        
        return _extractNumberAt(jsonBytes, jsonPos);
    }

    function _extractNumberAt(
        bytes memory jsonBytes,
        uint256 pos
    ) internal pure returns (int128) {
        uint256 len = jsonBytes.length;
        
        while (pos < len && (jsonBytes[pos] == ' ' || jsonBytes[pos] == '"' || jsonBytes[pos] == ':')) {
            pos++;
        }
        
        if (pos >= len) return 0;
        
        int128 result = 0;
        bool negative = false;
        bool hasDecimal = false;
        int128 decimalPlaces = 0;
        
        if (jsonBytes[pos] == '-') {
            negative = true;
            pos++;
        }
        
        while (pos < len) {
            bytes1 char = jsonBytes[pos];
            
            if (char >= '0' && char <= '9') {
                uint8 digit = uint8(char) - 48;
                result = result * 10 + int128(int256(uint256(digit)));
                if (hasDecimal) {
                    decimalPlaces++;
                }
            } else if (char == '.') {
                hasDecimal = true;
            } else {
                break;
            }
            pos++;
        }
        
        if (decimalPlaces < 2) {
            for (int128 i = decimalPlaces; i < 2; i++) {
                result = result * 10;
            }
        } else if (decimalPlaces > 2) {
            for (int128 i = 2; i < decimalPlaces; i++) {
                result = result / 10;
            }
        }
        
        return negative ? -result : result;
    }
}
