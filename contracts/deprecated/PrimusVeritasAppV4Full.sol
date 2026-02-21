// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VeritasValidationRegistryV4.sol";

interface ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external returns (bool passed, int128 value);
}

// Primus TaskResult structure
struct TaskResult {
    Attestation attestation;
}

struct Attestation {
    address recipient;
    bytes request;
    bytes responseResolve;
    string data;
    uint64 timestamp;
}

/**
 * @title PrimusVeritasAppV4Full
 * @notice V4 App with both callback and manual processing
 * @dev Supports Primus callback AND manual attestation processing
 */
contract PrimusVeritasAppV4Full {
    address public owner;
    VeritasValidationRegistryV4 public immutable registry;
    
    // Primus attestor
    address public constant PRIMUS_ATTESTOR = 0x0DE886e31723e64Aa72e51977B14475fB66a9f72;
    
    struct VerificationRule {
        string templateId;
        string dataKey;
        uint8 decimals;
        uint256 maxAge;
        bool active;
        string description;
    }
    
    struct CustomCheck {
        address checkContract;
        bytes params;
        int128 score;
        bool active;
    }
    
    mapping(uint256 => VerificationRule) public rules;
    mapping(uint256 => mapping(uint256 => CustomCheck)) public checks;
    mapping(uint256 => uint256) public checkCount;
    uint256 public ruleCount;
    
    mapping(bytes32 => bool) public processedTasks;
    
    event AttestationReceived(bytes32 indexed taskId, address caller, string data);
    event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score, int128 value);
    event CheckFailed(uint256 indexed ruleId, uint256 indexed checkId);
    event ValidationCompleted(bytes32 indexed taskId, uint8 score);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _registry) {
        owner = msg.sender;
        registry = VeritasValidationRegistryV4(_registry);
    }
    
    function addRule(
        string calldata templateId,
        string calldata dataKey,
        uint8 decimals,
        uint256 maxAge,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;
        rules[ruleId] = VerificationRule(templateId, dataKey, decimals, maxAge, true, description);
    }
    
    function addCheck(
        uint256 ruleId,
        address checkContract,
        bytes calldata params,
        int128 score
    ) external onlyOwner returns (uint256 checkId) {
        checkId = checkCount[ruleId]++;
        checks[ruleId][checkId] = CustomCheck(checkContract, params, score, true);
    }
    
    /**
     * @notice Primus callback - called by Primus attestor (if supported)
     */
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external {
        require(msg.sender == PRIMUS_ATTESTOR, "Only Primus");
        require(success, "Attestation failed");
        require(!processedTasks[taskId], "Already processed");
        
        _processAttestation(
            taskId,
            taskResult.attestation.recipient,
            taskResult.attestation.data,
            taskResult.attestation.timestamp,
            0
        );
    }
    
    /**
     * @notice Process attestation manually (anyone can call)
     * @dev Since Primus doesn't auto-call callbacks, use this function
     */
    function processAttestation(
        bytes32 attestationHash,
        address attestor,
        string calldata attestationData,
        uint64 timestamp,
        uint256 ruleId
    ) external {
        // Verify attestor is Primus
        require(attestor == PRIMUS_ATTESTOR, "Invalid attestor");
        require(!processedTasks[attestationHash], "Already processed");
        
        _processAttestation(attestationHash, address(this), attestationData, timestamp, ruleId);
    }
    
    function _processAttestation(
        bytes32 taskId,
        address recipient,
        string memory attestationData,
        uint64 timestamp,
        uint256 ruleId
    ) internal {
        VerificationRule storage rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        require(block.timestamp - timestamp <= rule.maxAge, "Expired");
        
        processedTasks[taskId] = true;
        
        emit AttestationReceived(taskId, msg.sender, attestationData);
        
        uint256 totalChecks = checkCount[ruleId];
        int128 totalScore = 0;
        int128 maxScore = 0;
        
        for (uint256 i = 0; i < totalChecks; i++) {
            CustomCheck storage check = checks[ruleId][i];
            maxScore += check.score;
            
            if (check.active) {
                try ICustomCheck(check.checkContract).validate(
                    rule.dataKey,
                    attestationData,
                    check.params
                ) returns (bool passed, int128 value) {
                    if (passed) {
                        totalScore += check.score;
                        emit CheckPassed(ruleId, i, check.score, value);
                    } else {
                        emit CheckFailed(ruleId, i);
                    }
                } catch {
                    emit CheckFailed(ruleId, i);
                }
            }
        }
        
        uint8 response = maxScore > 0 
            ? uint8((uint256(int256(totalScore)) * 100) / uint256(int256(maxScore)))
            : 0;
        
        registry.validationResponse(
            taskId,
            response,
            _toHexString(taskId),
            keccak256(bytes(attestationData)),
            rule.description
        );
        
        emit ValidationCompleted(taskId, response);
    }
    
    function _toHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(66);
        result[0] = '0';
        result[1] = 'x';
        for (uint256 i = 0; i < 32; i++) {
            result[2 + i * 2] = hexChars[uint8(data[i]) >> 4];
            result[3 + i * 2] = hexChars[uint8(data[i]) & 0x0f];
        }
        return string(result);
    }
}
