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
     * @param attestationUrl The URL from the attestation (actual URL fetched, as bytes)
     * @param attestationResponseResolve The responseResolve from attestation (contains keyName, parsePath)
     * @param attestationData The extracted data value from attestation
     * @param ruleUrlTemplate The URL template from the rule (with * placeholder)
     * @param ruleDataKey The dataKey from the rule
     * @param ruleParsePath The parsePath from the rule
     * @param params Custom parameters for this check (e.g., minFollowers threshold)
     * @return passed Whether the check passed (score is determined by PrimusVeritasApp)
     */
    function validate(
        bytes calldata attestationUrl,
        bytes calldata attestationResponseResolve,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata params
    ) external view returns (bool passed);
}
