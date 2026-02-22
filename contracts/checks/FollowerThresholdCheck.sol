// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";

/**
 * @title FollowerThresholdCheck
 * @notice Validates that X/Twitter follower count exceeds threshold
 * @dev Verifies URL template, dataKey, parsePath, and checks follower count
 */
contract FollowerThresholdCheck is ICustomCheck {

    // Params: just the threshold (e.g., 500)
    // Score is stored in PrimusVeritasApp.addCheck()

    // Primus responseResolve structure
    struct ResponseResolve {
        string keyName;
        string parseType;
        string parsePath;
        string op;
        string value;
    }

    /**
     * @notice Validate follower count against threshold
     * @dev Verifies URL, dataKey, parsePath from attestation match rule
     * @return passed Whether followers >= threshold (score is added by PrimusVeritasApp)
     */
    function validate(
        bytes calldata attestationUrl,
        bytes calldata attestationResponseResolve,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata params
    ) external pure override returns (bool passed) {
        // Decode params: just minFollowers threshold
        uint256 minFollowers = abi.decode(params, (uint256));

        // Verify URL, dataKey, parsePath
        _verifyAll(
            attestationUrl,
            attestationResponseResolve,
            ruleUrlTemplate,
            ruleDataKey,
            ruleParsePath
        );

        // Parse and verify value
        uint256 followerCount = _parseInt(attestationData);

        return followerCount >= minFollowers;
    }

    /**
     * @notice Verify all attestation parameters match rule
     */
    function _verifyAll(
        bytes memory attestationUrl,
        bytes memory responseResolveBytes,
        string memory ruleUrlTemplate,
        string memory ruleDataKey,
        string memory ruleParsePath
    ) internal pure {
        // Verify URL
        _verifyUrlWithEntity(attestationUrl, ruleUrlTemplate);

        // Decode just the first element's keyName and parsePath
        // ABI encoding: (ResponseResolve[]) = offset, length, (keyName_offset, parseType_offset, parsePath_offset, ...)
        (ResponseResolve memory resolve) = abi.decode(
            responseResolveBytes,
            (ResponseResolve)
        );

        require(bytes(resolve.keyName).length > 0, "Empty responseResolve");
        require(
            keccak256(bytes(resolve.keyName)) == keccak256(bytes(ruleDataKey)),
            "dataKey mismatch"
        );
        require(
            keccak256(bytes(resolve.parsePath)) == keccak256(bytes(ruleParsePath)),
            "parsePath mismatch"
        );
    }

    /**
     * @notice Verify URL matches template by extracting entity and rebuilding
     */
    function _verifyUrlWithEntity(
        bytes memory attestationUrl,
        string memory template
    ) internal pure {
        bytes memory urlBytes = attestationUrl;
        bytes memory templateBytes = bytes(template);

        uint256 placeholderPos = _indexOf(templateBytes, "*");
        require(placeholderPos < templateBytes.length, "No placeholder");

        require(urlBytes.length > placeholderPos, "URL too short");

        // Extract entity from URL
        uint256 entityEnd = urlBytes.length;
        for (uint256 i = placeholderPos; i < urlBytes.length; i++) {
            if (urlBytes[i] == '&' || urlBytes[i] == '/') {
                entityEnd = i;
                break;
            }
        }

        uint256 entityLen = entityEnd - placeholderPos;
        bytes memory entityBytes = new bytes(entityLen);
        for (uint256 i = 0; i < entityLen; i++) {
            entityBytes[i] = urlBytes[placeholderPos + i];
        }

        // Verify by rebuilding URL
        string memory expected = _replacePlaceholder(template, "*", string(entityBytes));
        require(
            keccak256(attestationUrl) == keccak256(bytes(expected)),
            "URL mismatch"
        );
    }

    function _replacePlaceholder(
        string memory template,
        string memory placeholder,
        string memory value
    ) internal pure returns (string memory) {
        bytes memory templateBytes = bytes(template);
        bytes memory placeholderBytes = bytes(placeholder);
        bytes memory valueBytes = bytes(value);

        uint256 pos = _indexOf(templateBytes, placeholderBytes);
        require(pos < templateBytes.length, "Placeholder not found");

        bytes memory result = new bytes(
            templateBytes.length - placeholderBytes.length + valueBytes.length
        );

        uint256 resultIndex = 0;
        for (uint256 i = 0; i < pos; i++) {
            result[resultIndex++] = templateBytes[i];
        }
        for (uint256 i = 0; i < valueBytes.length; i++) {
            result[resultIndex++] = valueBytes[i];
        }
        for (uint256 i = pos + placeholderBytes.length; i < templateBytes.length; i++) {
            result[resultIndex++] = templateBytes[i];
        }

        return string(result);
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

    function _parseInt(string memory s) internal pure returns (uint256) {
        bytes memory b = bytes(s);
        uint256 result = 0;

        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }

        return result;
    }
}
