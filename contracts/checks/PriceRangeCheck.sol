// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../ICustomCheck.sol";

/**
 * @title PriceRangeCheck
 * @notice Validates that a price/value is within a specified range
 * @dev Params: abi.encode(int128 minPrice, int128 maxPrice)
 *      Values should be scaled by 10^decimals (e.g., 6816445 for $68164.45 with 2 decimals)
 */
contract PriceRangeCheck is ICustomCheck {
    
    struct Params {
        int128 minPrice;
        int128 maxPrice;
    }
    
    /**
     * @notice Check if value is within [minPrice, maxPrice]
     */
    function validate(
        string calldata dataKey,
        string calldata attestationData,
        bytes calldata params
    ) external pure override returns (bool passed, int128 actualValue) {
        // Decode params
        Params memory p = abi.decode(params, (Params));
        
        // Extract value from JSON
        actualValue = _extractValue(attestationData, dataKey);
        
        // Check range (inclusive)
        passed = (actualValue >= p.minPrice && actualValue <= p.maxPrice);
    }
    
    /**
     * @notice Extract numeric value from JSON string
     * @dev Parses format: {"key":"value"} where value is a number
     *      Returns value scaled by 100 (2 decimal places)
     */
    function _extractValue(string memory data, string memory key) internal pure returns (int128) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        // Build search pattern: "key":"
        bytes memory searchPattern = abi.encodePacked('"', keyBytes, '":"');
        
        if (dataBytes.length < searchPattern.length) {
            return 0;
        }
        
        // Find the key
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
        
        if (valueStart == 0) {
            return 0;
        }
        
        // Find the closing quote
        uint256 valueEnd = valueStart;
        while (valueEnd < dataBytes.length && dataBytes[valueEnd] != '"') {
            valueEnd++;
        }
        
        // Extract value string
        bytes memory valueBytes = new bytes(valueEnd - valueStart);
        for (uint256 i = 0; i < valueBytes.length; i++) {
            valueBytes[i] = dataBytes[valueStart + i];
        }
        
        // Parse to int128 (scaled by 100 for 2 decimals)
        return _parseInt128(string(valueBytes));
    }
    
    /**
     * @notice Parse string to int128, handling decimals
     * @dev "68164.45" -> 6816445 (scaled by 100)
     */
    function _parseInt128(string memory s) internal pure returns (int128) {
        bytes memory b = bytes(s);
        int128 result = 0;
        bool negative = false;
        uint256 i = 0;
        
        if (b.length > 0 && b[0] == '-') {
            negative = true;
            i = 1;
        }
        
        // Parse integer part
        while (i < b.length && b[i] >= '0' && b[i] <= '9') {
            result = result * 10 + int128(int8(uint8(b[i]) - 48));
            i++;
        }
        
        // Parse decimal part (2 decimals)
        if (i < b.length && b[i] == '.') {
            i++;
            int128 decimal = 0;
            int128 multiplier = 10;
            while (i < b.length && b[i] >= '0' && b[i] <= '9' && multiplier > 0) {
                decimal = decimal * 10 + int128(int8(uint8(b[i]) - 48));
                i++;
            }
            result = result * 100 + decimal;
        } else {
            // No decimal point - still scale by 100
            result = result * 100;
        }
        
        return negative ? -result : result;
    }
}
