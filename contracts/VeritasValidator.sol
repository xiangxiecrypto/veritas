// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ICheck.sol";
import "./RuleRegistry.sol";

/**
 * @title VeritasValidator
 * @notice Core validation contract for zktls-core-sdk attestations
 * @dev Validates attestations without any business logic (no jobs, no escrow)
 */
contract VeritasValidator {
    
    RuleRegistry public immutable ruleRegistry;
    
    struct ValidationResult {
        uint256 ruleId;
        bool passed;
        uint256 score;
        uint256 timestamp;
        address validator;
        bytes32 attestationHash;
    }
    
    // Mapping from attestation hash to validation result
    mapping(bytes32 => ValidationResult) public results;
    
    // Events
    event ValidationPerformed(
        bytes32 indexed attestationHash,
        uint256 indexed ruleId,
        bool passed,
        uint256 score,
        address validator
    );
    
    // Errors
    error RuleNotActive(uint256 ruleId);
    error RuleNotFound(uint256 ruleId);
    error AlreadyValidated(bytes32 attestationHash);
    
    /**
     * @notice Constructor
     * @param _ruleRegistry Address of the RuleRegistry contract
     */
    constructor(address _ruleRegistry) {
        require(_ruleRegistry != address(0), "Veritas: invalid registry");
        ruleRegistry = RuleRegistry(_ruleRegistry);
    }
    
    /**
     * @notice Validate an attestation against a rule
     * @param attestation The attestation data from zktls-core-sdk
     * @param ruleId The rule identifier
     * @param responseData The response data to validate
     * @return passed Whether validation passed
     * @return score The validation score (0-100)
     * @return attestationHash The hash of the attestation for reference
     */
    function validate(
        bytes calldata attestation,
        uint256 ruleId,
        bytes calldata responseData
    ) external returns (bool passed, uint256 score, bytes32 attestationHash) {
        
        // Calculate attestation hash
        attestationHash = keccak256(attestation);
        
        // Check if already validated
        if (results[attestationHash].timestamp != 0) {
            revert AlreadyValidated(attestationHash);
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
        results[attestationHash] = ValidationResult({
            ruleId: ruleId,
            passed: passed,
            score: score,
            timestamp: block.timestamp,
            validator: msg.sender,
            attestationHash: attestationHash
        });
        
        emit ValidationPerformed(attestationHash, ruleId, passed, score, msg.sender);
        
        return (passed, score, attestationHash);
    }
    
    /**
     * @notice Get validation result by attestation hash
     * @param attestationHash The hash of the attestation
     * @return ruleId The rule used
     * @return passed Whether validation passed
     * @return score The validation score
     * @return timestamp When validation was performed
     */
    function getValidationResult(bytes32 attestationHash) external view returns (
        uint256 ruleId,
        bool passed,
        uint256 score,
        uint256 timestamp
    ) {
        ValidationResult memory result = results[attestationHash];
        return (
            result.ruleId,
            result.passed,
            result.score,
            result.timestamp
        );
    }
    
    /**
     * @notice Check if an attestation has been validated
     * @param attestationHash The hash of the attestation
     * @return Whether the attestation has been validated
     */
    function isValidated(bytes32 attestationHash) external view returns (bool) {
        return results[attestationHash].timestamp != 0;
    }
}
