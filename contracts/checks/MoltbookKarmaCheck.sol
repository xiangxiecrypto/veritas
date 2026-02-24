// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";
import "../IPrimus.sol";

/**
 * @title MoltbookKarmaCheck
 * @notice Validates Moltbook protected profile: URL, dataKey, parsePath, and karma > 0
 * @dev Combines SimpleVerificationCheck logic with karma threshold validation
 */
contract MoltbookKarmaCheck is ICustomCheck {
    
    /**
     * @notice Validate Moltbook protected profile attestation
     * @param request Encoded AttNetworkRequest[] array
     * @param responseResolves Encoded AttNetworkOneUrlResponseResolve[] array
     * @param attestationData The extracted karma value (JSON: {"karma":"1"})
     * @param ruleUrlTemplate Expected URL (https://www.moltbook.com/api/v1/agents/me)
     * @param ruleDataKey Expected dataKey (karma)
     * @param ruleParsePath Expected parsePath ($.agent.karma)
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
        // ========================================
        // STEP 1: Validate URL, dataKey, parsePath
        // ========================================
        
        // 1. Decode request array
        AttNetworkRequest[] memory requests = abi.decode(request, (AttNetworkRequest[]));
        
        if (requests.length == 0) {
            return false;
        }
        
        // 2. Check URL hash matches
        if (keccak256(bytes(requests[0].url)) != keccak256(bytes(ruleUrlTemplate))) {
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
        
        // 5. Check parsePath hash matches
        if (keccak256(bytes(resolves[0].oneUrlResponseResolve[0].parsePath)) != keccak256(bytes(ruleParsePath))) {
            return false;
        }
        
        // ========================================
        // STEP 2: Check karma > 0
        // ========================================
        
        uint256 karma = _parseKarma(attestationData);
        if (karma == 0) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Parse karma value from JSON data
     * @dev Extracts numeric value from {"karma":"1"} format
     * @param data JSON string with karma value
     * @return Karma value
     */
    function _parseKarma(string memory data) internal pure returns (uint256) {
        bytes memory dataBytes = bytes(data);
        
        // Find "karma":" pattern
        bytes memory pattern = bytes("karma\":\"");
        
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
