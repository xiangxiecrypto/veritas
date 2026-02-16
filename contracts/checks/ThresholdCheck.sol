// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../ICustomCheck.sol";

/**
 * @title ThresholdCheck
 * @notice Validates that a value exceeds a threshold
 * @dev Params: abi.encode(int128 threshold, bool greaterThanOrEqual)
 *      greaterThanOrEqual: true means >=, false means >
 */
contract ThresholdCheck is ICustomCheck {
    
    struct Params {
        int128 threshold;
        bool greaterThanOrEqual;  // true: >=, false: >
    }
    
    /**
     * @notice Check if value meets threshold
     */
    function validate(
        string calldata dataKey,
        string calldata attestationData,
        bytes calldata params
    ) external pure override returns (bool passed, int128 actualValue) {
        Params memory p = abi.decode(params, (Params));
        
        // Extract value from JSON
        actualValue = _extractValue(attestationData, dataKey);
        
        // Check threshold
        if (p.greaterThanOrEqual) {
            passed = actualValue >= p.threshold;
        } else {
            passed = actualValue > p.threshold;
        }
    }
    
    function _extractValue(string memory data, string memory key) internal pure returns (int128) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        bytes memory searchPattern = abi.encodePacked('"', keyBytes, '":"');
        
        if (dataBytes.length < searchPattern.length) return 0;
        
        uint256 valueStart = 0;
        for (uint256 i = 0; i <= dataBytes.length - searchPattern.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < searchPattern.length; j++) {
                if (dataBytes[i + j] != searchPattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                valueStart = i + searchPattern.length;
                break;
            }
        }
        
        if (valueStart == 0) return 0;
        
        uint256 valueEnd = valueStart;
        while (valueEnd < dataBytes.length && dataBytes[valueEnd] != '"') {
            valueEnd++;
        }
        
        bytes memory valueBytes = new bytes(valueEnd - valueStart);
        for (uint256 i = 0; i < valueBytes.length; i++) {
            valueBytes[i] = dataBytes[valueStart + i];
        }
        
        return _parseInt128(string(valueBytes));
    }
    
    function _parseInt128(string memory s) internal pure returns (int128) {
        bytes memory b = bytes(s);
        int128 result = 0;
        bool negative = false;
        uint256 i = 0;
        
        if (b.length > 0 && b[0] == '-') {
            negative = true;
            i = 1;
        }
        
        while (i < b.length && b[i] >= '0' && b[i] <= '9') {
            result = result * 10 + int128(int8(uint8(b[i]) - 48));
            i++;
        }
        
        if (i < b.length && b[i] == '.') {
            i++;
            int128 decimal = 0;
            while (i < b.length && b[i] >= '0' && b[i] <= '9') {
                decimal = decimal * 10 + int128(int8(uint8(b[i]) - 48));
                i++;
            }
            result = result * 100 + decimal;
        } else {
            result = result * 100;
        }
        
        return negative ? -result : result;
    }
}
