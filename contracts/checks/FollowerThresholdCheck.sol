// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICustomCheck.sol";

/**
 * @title FollowerThresholdCheck
 * @notice Validates that X/Twitter follower count exceeds threshold
 * @dev Used to give high scores to agents with established social presence
 */
contract FollowerThresholdCheck is ICustomCheck {
    
    /**
     * @notice Validate follower count against threshold
     * @param dataKey Should be "x_followers"
     * @param attestationData JSON string containing follower count
     * @param params Encoded (uint256 minFollowers, int128 scoreIfPassed)
     * @return passed True if followers >= threshold
     * @return value The follower count extracted
     */
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external pure override returns (bool passed, int128 value) {
        // Decode params: (uint256 minFollowers, int128 scoreWeight)
        (uint256 minFollowers, int128 scoreWeight) = abi.decode(
            params,
            (uint256, int128)
        );
        
        // Extract follower count from attestation data
        uint256 followerCount = extractFollowers(attestationData, dataKey);
        
        // Check if meets threshold
        passed = followerCount >= minFollowers;
        
        // Return follower count as value (for debugging/records)
        value = int128(uint128(followerCount));
        
        // Note: scoreWeight is returned through the check.score in the app
        // passed = true means the check.score will be added to total
    }
    
    /**
     * @notice Extract follower count from JSON attestation data
     * @param json The JSON string
     * @param key The key to extract (e.g., "x_followers")
     * @return count The follower count as uint256
     */
    function extractFollowers(
        string memory json,
        string memory key
    ) internal pure returns (uint256 count) {
        // Find the key in JSON
        bytes memory jsonBytes = bytes(json);
        bytes memory keyBytes = bytes(string(abi.encodePacked('"', key, '":')));
        
        uint256 keyPos = findPattern(jsonBytes, keyBytes, 0);
        require(keyPos > 0, "Key not found");
        
        // Find the number after the key
        uint256 start = keyPos + keyBytes.length;
        
        // Skip whitespace and quotes
        while (start < jsonBytes.length && 
               (jsonBytes[start] == ' ' || 
                jsonBytes[start] == '"' ||
                jsonBytes[start] == ':')) {
            start++;
        }
        
        // Parse the number
        count = 0;
        for (uint256 i = start; i < jsonBytes.length; i++) {
            bytes1 char = jsonBytes[i];
            if (char >= '0' && char <= '9') {
                count = count * 10 + uint256(uint8(char) - 48);
            } else {
                break;
            }
        }
        
        return count;
    }
    
    /**
     * @notice Find pattern in bytes
     */
    function findPattern(
        bytes memory data,
        bytes memory pattern,
        uint256 start
    ) internal pure returns (uint256) {
        if (pattern.length == 0 || data.length < pattern.length) {
            return 0;
        }
        
        for (uint256 i = start; i <= data.length - pattern.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < pattern.length; j++) {
                if (data[i + j] != pattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return i;
            }
        }
        
        return 0;
    }
}
