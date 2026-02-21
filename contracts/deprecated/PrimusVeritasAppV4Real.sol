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

/**
 * @title PrimusVeritasAppV4Real
 * @notice App that accepts real Primus callbacks
 * @dev No caller restriction - accepts callbacks from any Primus attestor
 */
contract PrimusVeritasAppV4Real {
    address public owner;
    VeritasValidationRegistryV4 public immutable registry;
    
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
    
    // Track all callback attempts
    struct CallbackAttempt {
        address caller;
        bytes32 taskId;
        string data;
        uint64 timestamp;
        bool success;
        uint256 timestamp_block;
    }
    mapping(uint256 => CallbackAttempt) public callbackAttempts;
    uint256 public callbackAttemptCount;
    
    event CallbackReceived(bytes32 indexed taskId, address caller, string data);
    event AttestationProcessed(bytes32 indexed taskId, address caller, uint8 score);
    event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score, int128 value);
    event CheckFailed(uint256 indexed ruleId, uint256 indexed checkId);
    
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
     * @notice Primus callback - NO CALLER RESTRICTION
     * @dev Accepts calls from any Primus attestor to see who actually calls
     */
    function reportTaskResultCallback(
        bytes32 taskId,
        address recipient,
        string calldata attestationData,
        uint64 timestamp,
        bool success
    ) external {
        // Log the callback attempt
        uint256 attemptId = callbackAttemptCount++;
        callbackAttempts[attemptId] = CallbackAttempt({
            caller: msg.sender,
            taskId: taskId,
            data: attestationData,
            timestamp: timestamp,
            success: success,
            timestamp_block: block.timestamp
        });
        
        emit CallbackReceived(taskId, msg.sender, attestationData);
        
        // Only process if not already done
        if (processedTasks[taskId]) {
            return;
        }
        
        if (!success) {
            return;
        }
        
        // Verify recipient is this contract (optional)
        // require(recipient == address(this), "Invalid recipient");
        
        processedTasks[taskId] = true;
        
        // Process with rule 0
        _processAttestation(taskId, attestationData, timestamp, 0);
    }
    
    function _processAttestation(
        bytes32 taskId,
        string memory attestationData,
        uint64 timestamp,
        uint256 ruleId
    ) internal {
        VerificationRule storage rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        require(block.timestamp - timestamp <= rule.maxAge, "Expired");
        
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
        
        emit AttestationProcessed(taskId, msg.sender, response);
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
