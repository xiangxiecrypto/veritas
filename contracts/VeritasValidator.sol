// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./mocks/IPrimusZKTLS.sol";
import "./interfaces/ICheck.sol";
import "./RuleRegistry.sol";

/**
 * @title VeritasValidator
 * @notice Core validation contract for Primus zktls attestations
 * @dev Validates attestations using Primus on-chain verification + custom checks
 * 
 * SECURITY: Only the attestation recipient can submit their own attestation
 */
contract VeritasValidator {
    
    RuleRegistry public immutable ruleRegistry;
    address public immutable primusAddress;
    
    struct ValidationResult {
        uint256 ruleId;
        bool passed;
        uint256 timestamp;
        address validator;
        address recipient;
        bytes32 attestationHash;
    }
    
    mapping(bytes32 => ValidationResult) public results;
    
    event ValidationPerformed(
        bytes32 indexed attestationHash,
        uint256 indexed ruleId,
        bool passed,
        address indexed recipient,
        address validator
    );
    
    error RuleNotActive(uint256 ruleId);
    error RuleNotFound(uint256 ruleId);
    error AlreadyValidated(bytes32 attestationHash);
    error PrimusVerificationFailed();
    error UnauthorizedRecipient(address expected, address actual);
    
    constructor(address _ruleRegistry, address _primusAddress) {
        require(_ruleRegistry != address(0), "Veritas: invalid registry");
        require(_primusAddress != address(0), "Veritas: invalid Primus address");
        
        ruleRegistry = RuleRegistry(_ruleRegistry);
        primusAddress = _primusAddress;
    }
    
    /**
     * @notice Validate a Primus attestation against a rule
     * @param attestation The full attestation from Primus zktls-core-sdk
     * @param ruleId The rule identifier
     * @return passed Whether validation passed (true/false)
     * @return attestationHash The hash of the attestation for reference
     */
    function validate(
        IPrimusZKTLS.Attestation calldata attestation,
        uint256 ruleId
    ) external returns (bool passed, bytes32 attestationHash) {
        
        // Check recipient authorization
        if (attestation.recipient != msg.sender) {
            revert UnauthorizedRecipient(attestation.recipient, msg.sender);
        }
        
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
        
        // Verify attestation with Primus
        try IPrimusZKTLS(primusAddress).verifyAttestation(attestation) {
            // Primus verification passed
        } catch {
            revert PrimusVerificationFailed();
        }
        
        // Execute custom check
        ICheck check = ICheck(rule.checkContract);
        
        bytes memory attestationData = abi.encode(attestation);
        
        passed = check.validate(
            attestationData,
            rule.checkData
        );
        
        // Store result
        results[attestationHash] = ValidationResult({
            ruleId: ruleId,
            passed: passed,
            timestamp: block.timestamp,
            validator: msg.sender,
            recipient: attestation.recipient,
            attestationHash: attestationHash
        });
        
        emit ValidationPerformed(attestationHash, ruleId, passed, attestation.recipient, msg.sender);
        
        return (passed, attestationHash);
    }
    
    function getValidationResult(bytes32 attestationHash) external view returns (
        uint256 ruleId,
        bool passed,
        uint256 timestamp,
        address recipient,
        address validator
    ) {
        ValidationResult memory result = results[attestationHash];
        return (
            result.ruleId,
            result.passed,
            result.timestamp,
            result.recipient,
            result.validator
        );
    }
    
    function isValidated(bytes32 attestationHash) external view returns (bool) {
        return results[attestationHash].timestamp != 0;
    }
}
