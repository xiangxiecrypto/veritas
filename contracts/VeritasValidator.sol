// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@primuslabs/zktls-contracts/src/IPrimusZKTLS.sol";
import "./interfaces/ICheck.sol";
import "./RuleRegistry.sol";

/**
 * @title VeritasValidator
 * @notice Core validation contract for Primus zktls attestations
 * @dev Validates attestations using Primus on-chain verification + custom checks
 * 
 * IMPORTANT: Attestation contains all necessary data (request, response, parsePath)
 * No need for separate responseData parameter - prevents data tampering
 */
contract VeritasValidator {
    
    RuleRegistry public immutable ruleRegistry;
    address public immutable primusAddress;
    
    struct ValidationResult {
        uint256 ruleId;
        bool passed;
        uint256 timestamp;
        address validator;
        bytes32 attestationHash;
    }
    
    mapping(bytes32 => ValidationResult) public results;
    
    event ValidationPerformed(
        bytes32 indexed attestationHash,
        uint256 indexed ruleId,
        bool passed,
        address validator
    );
    
    error RuleNotActive(uint256 ruleId);
    error RuleNotFound(uint256 ruleId);
    error AlreadyValidated(bytes32 attestationHash);
    error PrimusVerificationFailed();
    
    constructor(address _ruleRegistry, address _primusAddress) {
        require(_ruleRegistry != address(0), "Veritas: invalid registry");
        require(_primusAddress != address(0), "Veritas: invalid Primus address");
        
        ruleRegistry = RuleRegistry(_ruleRegistry);
        primusAddress = _primusAddress;
    }
    
    /**
     * @notice Validate a Primus attestation against a rule
     * @param attestation The full attestation from Primus zktls-core-sdk
     *        Contains: request, response, parsePath, data, signatures
     * @param ruleId The rule identifier
     * @return passed Whether validation passed (true/false)
     * @return attestationHash The hash of the attestation for reference
     * 
     * Security: Attestation contains all data, preventing tampering
     */
    function validate(
        Attestation calldata attestation,
        uint256 ruleId
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
        
        // 1. Verify attestation with Primus (verifies signature, data integrity, parsePath)
        try IPrimusZKTLS(primusAddress).verifyAttestation(attestation) {
            // Primus verified:
            // - Signature authenticity
            // - Data integrity
            // - TLS handshake occurred
            // - parsePath matches data structure
        } catch {
            revert PrimusVerificationFailed();
        }
        
        // 2. Execute custom check logic (validates URL, method, response code, etc.)
        ICheck check = ICheck(rule.checkContract);
        
        // Encode full attestation for check contract
        bytes memory attestationData = abi.encode(attestation);
        
        passed = check.validate(
            attestationData,  // Contains all necessary data
            rule.checkData
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
    
    function isValidated(bytes32 attestationHash) external view returns (bool) {
        return results[attestationHash].timestamp != 0;
    }
}
