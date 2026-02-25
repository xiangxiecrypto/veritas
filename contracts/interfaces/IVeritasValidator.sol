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
     * @param jobId The job identifier
     * @param ruleId The rule identifier
     * @param attestation The attestation data
     * @param responseData The response data
     * @return passed Whether validation passed
     * @return score The validation score
     */
    function validate(
        bytes32 jobId,
        uint256 ruleId,
        bytes calldata attestation,
        bytes calldata responseData
    ) external returns (bool passed, uint256 score);
    
    /**
     * @notice Get validation result for a job
     * @param jobId The job identifier
     * @return ruleId The rule used
     * @return passed Whether validation passed
     * @return score The validation score
     * @return timestamp When validation was performed
     */
    function getValidationResult(bytes32 jobId) external view returns (
        uint256 ruleId,
        bool passed,
        uint256 score,
        uint256 timestamp
    );
    
    /**
     * @notice Check if a job has been validated
     * @param jobId The job identifier
     * @return Whether the job has been validated
     */
    function isValidated(bytes32 jobId) external view returns (bool);
}
