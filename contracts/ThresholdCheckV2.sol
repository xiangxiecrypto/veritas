// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ThresholdCheckV2
 * @notice Validates that a value doesn't exceed a threshold percentage from expected
 * @dev Designed to work with Primus SDK - receives pre-extracted values, NOT JSON
 * 
 * IMPORTANT: This contract receives the extracted value directly from the attestation.
 * The JSON parsing happens in the Primus SDK using JSONPath expressions.
 */
contract ThresholdCheckV2 {
    struct ThresholdParams {
        int128 expectedValue;   // The expected/reference value (in smallest unit)
        int128 maxDeviationBps; // Maximum allowed deviation (in basis points, 500 = 5%)
    }

    /**
     * @notice Validate that the attested value is within threshold of expected
     * @param dataKey The key name from responseResolves (e.g., "ethPrice")
     * @param attestationValue The extracted value from attestation (e.g., "3500.5")
     * @param params Encoded ThresholdParams
     * @return passed Whether validation passed
     * @return value The extracted value
     */
    function validate(
        string calldata dataKey,
        string calldata attestationValue,
        bytes calldata params
    ) external pure returns (bool passed, int128 value) {
        ThresholdParams memory threshold = abi.decode(params, (ThresholdParams));
        
        // Parse the attestation value (string) to int128
        value = _parsePrice(attestationValue);
        
        if (threshold.expectedValue == 0) {
            passed = (value == 0);
        } else {
            // Calculate absolute difference
            int128 diff = value > threshold.expectedValue 
                ? value - threshold.expectedValue 
                : threshold.expectedValue - value;
            
            // Calculate deviation in basis points (10000 = 100%)
            int128 absExpected = threshold.expectedValue >= 0 
                ? threshold.expectedValue 
                : -threshold.expectedValue;
            
            // Prevent division by zero
            if (absExpected == 0) {
                passed = (value == 0);
            } else {
                int128 deviationBps = (diff * 10000) / absExpected;
                passed = (deviationBps <= threshold.maxDeviationBps);
            }
        }
    }

    /**
     * @notice Parse a price string to int128 (in cents)
     * @param priceStr The price as a string (e.g., "3500.5")
     * @return The price in cents (e.g., 350050)
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
        
        if (strBytes[0] == '-') {
            negative = true;
            i = 1;
        }
        
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
            i++;
        }
        
        // Convert to cents (2 decimal places)
        if (decimalPlaces == 0) {
            result = result * 100;
        } else if (decimalPlaces == 1) {
            result = result * 10;
        } else if (decimalPlaces > 2) {
            for (uint256 j = 2; j < decimalPlaces; j++) {
                result = result / 10;
            }
        }
        
        return negative ? -result : result;
    }
}
