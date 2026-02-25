// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ICheck.sol";
import "./RuleRegistry.sol";

/**
 * @title VeritasValidator
 * @notice Validates attestations from zktls-core-sdk
 * @dev Core validation contract for Veritas Protocol
 */
contract VeritasValidator {
    
    RuleRegistry public immutable ruleRegistry;
    
    struct ValidationResult {
        uint256 ruleId;
        bool passed;
        uint256 score;
        uint256 timestamp;
        address validator;
        bytes attestationHash;  // Hash of the attestation for reference
    }
    
    // Mapping from job ID to validation result
    mapping(bytes32 => ValidationResult) public results;
    
    // Events
    event ValidationPerformed(
        bytes32 indexed jobId,
        uint256 indexed ruleId,
        bool passed,
        uint256 score,
        address validator
    );
    
    event ValidationResultCleared(bytes32 indexed jobId);
    
    // Errors
    error RuleNotActive(uint256 ruleId);
    error RuleNotFound(uint256 ruleId);
    error ValidationFailed(uint256 ruleId, uint256 score, uint256 required);
    error AlreadyValidated(bytes32 jobId);
    
    /**
     * @notice Constructor
     * @param _ruleRegistry Address of the RuleRegistry contract
     */
    constructor(address _ruleRegistry) {
        require(_ruleRegistry != address(0), "Veritas: invalid registry");
        ruleRegistry = RuleRegistry(_ruleRegistry);
    }
    
    /**
     * @notice Validate an attestation for a job
     * @param jobId The job identifier
     * @param ruleId The rule identifier
     * @param attestation The attestation data from zktls-core-sdk
     * @param responseData The response data from API call
     * @return passed Whether validation passed
     * @return score The validation score
     */
    function validate(
        bytes32 jobId,
        uint256 ruleId,
        bytes calldata attestation,
        bytes calldata responseData
    ) external returns (bool passed, uint256 score) {
        
        // Check if already validated
        if (results[jobId].timestamp != 0) {
            revert AlreadyValidated(jobId);
        }
        
        // Get the rule
        RuleRegistry.Rule memory rule = ruleRegistry.getRule(ruleId);
        
        if (rule.id == 0) {
            revert RuleNotFound(ruleId);
        }
        
        if (!rule.active) {
            revert RuleNotActive(ruleId);
        }
        
        // Call the check contract
        ICheck check = ICheck(rule.checkContract);
        (passed, score) = check.validate(
            attestation,
            rule.checkData,
            responseData
        );
        
        // Check if score meets requirement
        if (score < rule.requiredScore) {
            passed = false;
        }
        
        // Store the result
        results[jobId] = ValidationResult({
            ruleId: ruleId,
            passed: passed,
            score: score,
            timestamp: block.timestamp,
            validator: msg.sender,
            attestationHash: keccak256(attestation)
        });
        
        emit ValidationPerformed(jobId, ruleId, passed, score, msg.sender);
        
        return (passed, score);
    }
    
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
    ) {
        ValidationResult memory result = results[jobId];
        return (
            result.ruleId,
            result.passed,
            result.score,
            result.timestamp
        );
    }
    
    /**
     * @notice Check if a job has been validated
     * @param jobId The job identifier
     * @return Whether the job has been validated
     */
    function isValidated(bytes32 jobId) external view returns (bool) {
        return results[jobId].timestamp != 0;
    }
    
    /**
     * @notice Clear validation result (only for testing)
     * @param jobId The job identifier
     */
    function clearValidationResult(bytes32 jobId) external {
        // This should be restricted in production
        // Only for testing purposes
        delete results[jobId];
        emit ValidationResultCleared(jobId);
    }
}
