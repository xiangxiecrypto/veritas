// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ICustomCheck
 * @notice Interface for custom check contracts
 * @dev Simplified interface with proper types
 */
interface ICustomCheck {
    /**
     * @notice Validate attestation data
     * @param request Encoded AttNetworkRequest[] array
     * @param responseResolves Encoded AttNetworkOneUrlResponseResolve[] array
     * @param attestationData The extracted data value from attestation
     * @param ruleUrlTemplate The URL template from the rule
     * @param ruleDataKey The dataKey from the rule
     * @param ruleParsePath The parsePath from the rule
     * @param params Custom parameters for this check
     * @return passed Whether the check passed
     */
    function validate(
        bytes calldata request,
        bytes calldata responseResolves,
        string calldata attestationData,
        string calldata ruleUrlTemplate,
        string calldata ruleDataKey,
        string calldata ruleParsePath,
        bytes calldata params
    ) external view returns (bool passed);
}
