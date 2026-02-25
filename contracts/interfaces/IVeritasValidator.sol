// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IVeritasValidator
 * @notice Interface for Veritas validator contract
 * @dev Validates attestations from zktls-core-sdk
 */
interface IVeritasValidator {
    /**
     * @notice Validate an attestation against a rule
     * @param attestation The attestation data
     * @param ruleId The rule identifier
     * @param responseData The response data
     * @return passed Whether validation passed (true/false)
     * @return attestationHash The hash of the attestation
     */
    function validate(
        bytes calldata attestation,
        uint256 ruleId,
        bytes calldata responseData
    ) external returns (bool passed, bytes32 attestationHash);
    
    /**
     * @notice Get validation result by attestation hash
     * @param attestationHash The hash of the attestation
     * @return ruleId The rule used
     * @return passed Whether validation passed
     * @return timestamp When validation was performed
     */
    function getValidationResult(bytes32 attestationHash) external view returns (
        uint256 ruleId,
        bool passed,
        uint256 timestamp
    );
    
    /**
     * @notice Check if an attestation has been validated
     * @param attestationHash The hash of the attestation
     * @return Whether the attestation has been validated
     */
    function isValidated(bytes32 attestationHash) external view returns (bool);
}
