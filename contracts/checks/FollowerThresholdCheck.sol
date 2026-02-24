// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";
import "../IPrimus.sol";

/**
 * @title FollowerThresholdCheck
 * @notice Validates that X/Twitter follower count exceeds threshold
 * @dev Checks URL template, dataKey, parsePath, and follower count
 */
contract FollowerThresholdCheck is ICustomCheck {

    /**
     * @notice Validate follower count against threshold
     * @param request Encoded AttNetworkRequest[] array
     * @param responseResolves Encoded AttNetworkOneUrlResponseResolve[] array
     * @param attestationData The extracted data value from attestation (JSON: {"x_followers":"1234"})
     * @param ruleUrlTemplate Expected URL template (e.g., https://www.moltbook.com/api/v1/agents/profile?name=*)
     * @param ruleDataKey Expected dataKey (e.g., "x_followers")
     * @param ruleParsePath Expected parsePath (e.g., "$.agent.owner.x_follower_count")
     * @return passed Whether the check passed
     */
    function validate(
        bytes calldata request,
        bytes calldata responseResolves,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata /* params */
    ) external pure override returns (bool) {
        // 1. Decode request array
        AttNetworkRequest[] memory requests = abi.decode(request, (AttNetworkRequest[]));
        
        if (requests.length == 0) {
            return false;
        }
        
        // 2. Check URL: replace entity with * and compare hash
        string memory normalizedUrl = _normalizeUrl(requests[0].url, ruleUrlTemplate);
        if (keccak256(bytes(normalizedUrl)) != keccak256(bytes(ruleUrlTemplate))) {
            return false;
        }
        
        // 3. Decode responseResolves array
        AttNetworkOneUrlResponseResolve[] memory resolves = abi.decode(responseResolves, (AttNetworkOneUrlResponseResolve[]));
        
        if (resolves.length == 0 || resolves[0].oneUrlResponseResolve.length == 0) {
            return false;
        }
        
        // 4. Check dataKey
        if (keccak256(bytes(resolves[0].oneUrlResponseResolve[0].keyName)) != keccak256(bytes(ruleDataKey))) {
            return false;
        }
        
        // 5. Check parsePath
        if (keccak256(bytes(resolves[0].oneUrlResponseResolve[0].parsePath)) != keccak256(bytes(ruleParsePath))) {
            return false;
        }
        
        // 6. Parse follower count from data and verify >= 500
        uint256 followerCount = _parseFollowerCount(attestationData);
        if (followerCount < 500) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Normalize URL by replacing entity with *
     * @dev Finds the entity in the URL and replaces it with *
     * @param actualUrl The actual URL with real entity (e.g., https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus)
     * @param template The URL template with * placeholder (e.g., https://www.moltbook.com/api/v1/agents/profile?name=*)
     * @return Normalized URL with entity replaced by *
     */
    function _normalizeUrl(string memory actualUrl, string memory template) internal pure returns (string memory) {
        bytes memory urlBytes = bytes(actualUrl);
        bytes memory templateBytes = bytes(template);
        
        // Find * position in template
        int256 starPos = -1;
        for (uint256 i = 0; i < templateBytes.length; i++) {
            if (templateBytes[i] == 0x2a) { // '*'
                starPos = int256(i);
                break;
            }
        }
        
        // If no * found, return original URL
        if (starPos < 0) {
            return actualUrl;
        }
        
        uint256 starIndex = uint256(starPos);
        
        // Verify prefix matches
        for (uint256 i = 0; i < starIndex; i++) {
            if (urlBytes.length <= i || urlBytes[i] != templateBytes[i]) {
                return actualUrl; // Prefix mismatch
            }
        }
        
        // Find end of entity in actual URL (next & or end of string)
        uint256 entityEnd = urlBytes.length;
        for (uint256 i = starIndex; i < urlBytes.length; i++) {
            if (urlBytes[i] == 0x26) { // '&'
                entityEnd = i;
                break;
            }
        }
        
        // Build normalized URL: prefix + * + suffix
        bytes memory suffix = new bytes(urlBytes.length - entityEnd);
        for (uint256 i = 0; i < suffix.length; i++) {
            suffix[i] = urlBytes[entityEnd + i];
        }
        
        bytes memory normalized = new bytes(starIndex + 1 + suffix.length);
        
        // Copy prefix
        for (uint256 i = 0; i < starIndex; i++) {
            normalized[i] = urlBytes[i];
        }
        
        // Add *
        normalized[starIndex] = 0x2a;
        
        // Copy suffix
        for (uint256 i = 0; i < suffix.length; i++) {
            normalized[starIndex + 1 + i] = suffix[i];
        }
        
        return string(normalized);
    }
    
    /**
     * @notice Parse follower count from JSON data
     * @dev Extracts numeric value from {"x_followers":"1234"} format
     * @param data JSON string with follower count
     * @return Follower count
     */
    function _parseFollowerCount(string memory data) internal pure returns (uint256) {
        bytes memory dataBytes = bytes(data);
        
        // Find "x_followers":" pattern
        bytes memory pattern = bytes("x_followers\":\"");
        
        int256 startPos = -1;
        for (uint256 i = 0; i <= dataBytes.length - pattern.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < pattern.length; j++) {
                if (dataBytes[i + j] != pattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                startPos = int256(i + pattern.length);
                break;
            }
        }
        
        if (startPos < 0) {
            return 0;
        }
        
        // Parse number until " or }
        uint256 result = 0;
        for (uint256 i = uint256(startPos); i < dataBytes.length; i++) {
            uint8 c = uint8(dataBytes[i]);
            if (c >= 48 && c <= 57) { // 0-9
                result = result * 10 + (c - 48);
            } else if (c == 0x22 || c == 0x7d) { // " or }
                break;
            }
        }
        
        return result;
    }
}
