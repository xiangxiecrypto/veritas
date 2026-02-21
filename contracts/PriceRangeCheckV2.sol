// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PriceRangeCheckV2
 * @notice Validates that a price value is within a specified range
 * @dev Designed to work with Primus SDK - receives pre-extracted values, NOT JSON
 * 
 * IMPORTANT: This contract receives the extracted value directly from the attestation.
 * The JSON parsing happens in the Primus SDK using JSONPath expressions like:
 *   $.data[0].last
 * 
 * The attestation.data will contain the extracted value as a string, e.g., "67000.5"
 */
contract PriceRangeCheckV2 {
    struct RangeParams {
        int128 minPrice;    // Minimum acceptable price (in smallest unit, e.g., cents)
        int128 maxPrice;    // Maximum acceptable price (in smallest unit, e.g., cents)
    }

    /**
     * @notice Validate that the attested price value is within range
     * @param dataKey The key name from responseResolves (e.g., "btcPrice")
     * @param attestationValue The extracted value from attestation (e.g., "67000.5")
     * @param params Encoded RangeParams (minPrice, maxPrice)
     * @return passed Whether validation passed
     * @return value The extracted price value
     */
    function validate(
        string calldata dataKey,
        string calldata attestationValue,
        bytes calldata params
    ) external pure returns (bool passed, int128 value) {
        RangeParams memory range = abi.decode(params, (RangeParams));
        
        // Parse the attestation value (string like "67000.5") to int128
        value = _parsePrice(attestationValue);
        
        // Check if within range
        passed = (value >= range.minPrice && value <= range.maxPrice);
    }

    /**
     * @notice Parse a price string to int128 (in cents)
     * @param priceStr The price as a string (e.g., "67000.5" or "67000")
     * @return The price in cents (e.g., 6700050)
     */
    function _parsePrice(string calldata priceStr) internal pure returns (int128) {
        bytes memory strBytes = bytes(priceStr);
        uint256 len = strBytes.length;
        
        if (len == 0) return 0;
        
        int128 result = 0;
        bool negative = false;
        bool hasDecimal = false;
        uint256 decimalPlaces = 0;
        uint256 i = 0;
        
        // Handle negative sign
        if (strBytes[0] == '-') {
            negative = true;
            i = 1;
        }
        
        // Parse digits
        while (i < len) {
            bytes1 char = strBytes[i];
            
            if (char >= '0' && char <= '9') {
                uint8 digit = uint8(char) - 48;
                result = result * 10 + int128(int256(uint256(digit)));
                if (hasDecimal) {
                    decimalPlaces++;
                }
            } else if (char == '.') {
                hasDecimal = true;
            }
            // Ignore other characters (like quotes, commas, etc.)
            i++;
        }
        
        // Convert to cents (2 decimal places)
        if (decimalPlaces == 0) {
            // No decimal: "67000" -> 6700000 cents
            result = result * 100;
        } else if (decimalPlaces == 1) {
            // One decimal: "67000.5" -> 6700050 cents (already correct)
            result = result * 10;
        } else if (decimalPlaces == 2) {
            // Two decimals: "67000.50" -> 6700050 cents (already correct)
            // No change needed
        } else {
            // More than 2 decimals: truncate
            for (uint256 j = 2; j < decimalPlaces; j++) {
                result = result / 10;
            }
        }
        
        return negative ? -result : result;
    }
}
