// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ICustomCheck
 * @notice Interface for custom check contracts
 * @dev Implement this interface to create custom validation checks
 *      Check contracts are reusable across different rules
 */
interface ICustomCheck {
    /**
     * @notice Validate attestation data
     * @param dataKey The JSON key to extract from data
     * @param attestationData JSON data from attestation (e.g., {"btcPrice":"68164.45"})
     * @param params Custom parameters for this check (encoded by caller)
     * @return passed Whether the check passed
     * @return actualValue The actual value extracted (for events/logs)
     */
    function validate(
        string calldata dataKey,
        string calldata attestationData,
        bytes calldata params
    ) external view returns (bool passed, int128 actualValue);
}
