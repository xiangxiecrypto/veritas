// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@primuslabs/zktls-contracts/src/IPrimusZKTLS.sol";
import "./interfaces/ICheck.sol";
import "./RuleRegistry.sol";

/**
 * @title VeritasValidator
 * @notice Core validation contract for Primus zktls attestations
 * @dev Validates attestations using Primus on-chain verification + custom checks
 */
contract VeritasValidator {
    
    RuleRegistry public immutable ruleRegistry;
    address public immutable primusAddress;  // Primus ZKTLS contract address
    
    struct ValidationResult {
        uint256 ruleId;
        bool passed;
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
        address validator
    );
    
    event PrimusAddressUpdated(address indexed newAddress);
    
    // Errors
    error RuleNotActive(uint256 ruleId);
    error RuleNotFound(uint256 ruleId);
    error AlreadyValidated(bytes32 attestationHash);
    error PrimusVerificationFailed();
    
    /**
     * @notice Constructor
     * @param _ruleRegistry Address of the RuleRegistry contract
     * @param _primusAddress Address of the Primus ZKTLS contract
     */
    constructor(address _ruleRegistry, address _primusAddress) {
        require(_ruleRegistry != address(0), "Veritas: invalid registry");
        require(_primusAddress != address(0), "Veritas: invalid Primus address");
        
        ruleRegistry = RuleRegistry(_ruleRegistry);
        primusAddress = _primusAddress;
    }
    
    /**
     * @notice Validate a Primus attestation against a rule
     * @param attestation The attestation data from Primus zktls-core-sdk
     * @param ruleId The rule identifier
     * @param responseData The response data to validate
     * @return passed Whether validation passed (true/false)
     * @return attestationHash The hash of the attestation for reference
     */
    function validate(
        Attestation calldata attestation,
        uint256 ruleId,
        bytes calldata responseData
    ) external returns (bool passed, bytes32 attestationHash) {
        
        // Calculate attestation hash
        attestationHash = keccak256(abi.encode(attestation));
        
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
        
        // 1. Verify attestation with Primus on-chain
        try IPrimusZKTLS(primusAddress).verifyAttestation(attestation) {
            // Primus verification passed
        } catch {
            revert PrimusVerificationFailed();
        }
        
        // 2. Execute custom check logic
        ICheck check = ICheck(rule.checkContract);
        passed = check.validate(
            abi.encode(attestation),
            rule.checkData,
            responseData
        );
        
        // Store the result
        results[attestationHash] = ValidationResult({
            ruleId: ruleId,
            passed: passed,
            timestamp: block.timestamp,
            validator: msg.sender,
            attestationHash: attestationHash
        });
        
        emit ValidationPerformed(attestationHash, ruleId, passed, msg.sender);
        
        return (passed, attestationHash);
    }
    
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
    ) {
        ValidationResult memory result = results[attestationHash];
        return (
            result.ruleId,
            result.passed,
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
