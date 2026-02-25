// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./mocks/IPrimusZKTLS.sol";
import "./RuleRegistry.sol";
import "./interfaces/ICustomCheck.sol";

/**
 * @title VeritasValidator
 * @notice Generic validator compatible with ICustomCheck interface
 * @dev Encodes attestation fields as bytes to avoid memory issues
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
    error CheckValidationFailed();
    error AttestationExpired(uint256 attestationTime, uint256 maxAge, uint256 currentTime);
    
    constructor(address _ruleRegistry, address _primusAddress) {
        require(_ruleRegistry != address(0), "Veritas: invalid registry");
        require(_primusAddress != address(0), "Veritas: invalid Primus address");
        ruleRegistry = RuleRegistry(_ruleRegistry);
        primusAddress = _primusAddress;
    }
    
    /**
     * @notice Validate attestation against a rule
     * @param attestation Full attestation from Primus
     * @param ruleId Rule identifier
     */
    function validate(
        IPrimusZKTLS.Attestation calldata attestation,
        uint256 ruleId
    ) external returns (bool passed, bytes32 attestationHash) {
        
        // 1. Check recipient authorization
        if (attestation.recipient != msg.sender) {
            revert UnauthorizedRecipient(attestation.recipient, msg.sender);
        }
        
        // 2. Calculate attestation hash
        attestationHash = keccak256(abi.encode(attestation));
        
        // 3. Check if already validated
        if (results[attestationHash].timestamp != 0) {
            revert AlreadyValidated(attestationHash);
        }
        
        // 4. Get rule
        RuleRegistry.Rule memory rule = ruleRegistry.getRule(ruleId);
        
        if (rule.id == 0) {
            revert RuleNotFound(ruleId);
        }
        
        if (!rule.active) {
            revert RuleNotActive(ruleId);
        }
        
        // 5. Check timestamp (age verification)
        uint64 attestationTime = attestation.timestamp / 1000;
        uint256 currentTime = block.timestamp;
        
        if (currentTime > attestationTime + rule.maxAge) {
            revert AttestationExpired(attestationTime, rule.maxAge, currentTime);
        }
        
        // 6. Verify attestation with Primus ZKTLS
        try IPrimusZKTLS(primusAddress).verifyAttestation(attestation) {
            // Primus verification passed
        } catch {
            revert PrimusVerificationFailed();
        }
        
        // 7. Encode attestation fields as bytes (avoid dynamic array issues)
        bytes memory encodedRequest = encodeRequest(attestation.request);
        bytes memory encodedResponseResolves = encodeResponseResolves(attestation.reponseResolve);
        
        // 8. Extract first parsePath and dataKey
        string memory parsePath = "";
        string memory dataKey = "";
        if (attestation.reponseResolve.length > 0) {
            parsePath = attestation.reponseResolve[0].parsePath;
            dataKey = attestation.reponseResolve[0].keyName;
        }
        
        // 9. Call external check contract with encoded data
        // Pass rule's expected dataKey and parsePath for validation
        try ICustomCheck(rule.checkContract).validate(
            encodedRequest,
            encodedResponseResolves,
            attestation.data,
            rule.urlTemplate,
            rule.expectedDataKey,      // Rule's expected dataKey
            rule.expectedParsePath,    // Rule's expected parsePath
            rule.checkData
        ) returns (bool checkPassed) {
            passed = checkPassed;
        } catch {
            revert CheckValidationFailed();
        }
        
        if (!passed) {
            revert CheckValidationFailed();
        }
        
        // 10. Store result
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
    
    /**
     * @notice Encode AttNetworkRequest to bytes (simplified - only url and method)
     */
    function encodeRequest(
        IPrimusZKTLS.AttNetworkRequest calldata request
    ) internal pure returns (bytes memory) {
        // Only encode essential fields to avoid stack issues
        return abi.encode(request.url, request.method);
    }
    
    /**
     * @notice Encode AttNetworkResponseResolve[] to bytes (simplified)
     */
    function encodeResponseResolves(
        IPrimusZKTLS.AttNetworkResponseResolve[] calldata resolves
    ) internal pure returns (bytes memory) {
        // Encode count and first resolve only (to avoid memory issues)
        if (resolves.length == 0) {
            return abi.encode(uint256(0));
        }
        return abi.encode(resolves.length, resolves[0].keyName, resolves[0].parsePath);
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
}
