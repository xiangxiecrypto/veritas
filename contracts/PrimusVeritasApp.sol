// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VeritasValidationRegistryV4.sol";
import "./IPrimus.sol";

interface ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external returns (bool passed, int128 value);
}

// ============================================
// PRIMUS VERITAS APP V5 - CORRECT CALLBACK
// ============================================

/**
 * @title PrimusVeritasAppV5
 * @notice Fixed callback implementation matching Primus SDK
 * @dev Implements IPrimusNetworkCallback with correct TaskResult struct
 */
contract PrimusVeritasAppV5 {
    address public owner;
    VeritasValidationRegistryV4 public immutable registry;
    IPrimusTask public immutable primusTask;
    
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
    
    struct PendingValidation {
        uint256 ruleId;
        uint256[] checkIds;
        uint256 agentId;
        address requester;
    }
    
    mapping(uint256 => VerificationRule) public rules;
    mapping(uint256 => mapping(uint256 => CustomCheck)) public checks;
    mapping(uint256 => uint256) public checkCount;
    uint256 public ruleCount;
    
    // Track pending validations by taskId
    mapping(bytes32 => PendingValidation) public pendingValidations;
    mapping(bytes32 => bool) public processedTasks;
    
    // Debug: Track all callback attempts
    struct CallbackAttempt {
        address caller;
        bytes32 taskId;
        address attestor;
        string data;
        uint256 blockTime;
        bool success;
    }
    mapping(uint256 => CallbackAttempt) public callbackAttempts;
    uint256 public callbackAttemptCount;
    
    // Events
    event RuleAdded(uint256 indexed ruleId, string templateId);
    event CheckAdded(uint256 indexed ruleId, uint256 indexed checkId, int128 score);
    event ValidationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId);
    event CallbackReceived(bytes32 indexed taskId, address caller, address attestor);
    event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score, int128 value);
    event CheckFailed(uint256 indexed ruleId, uint256 indexed checkId);
    event ValidationCompleted(bytes32 indexed taskId, uint8 score);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    /**
     * @dev Only the Primus Task contract can call the callback
     */
    modifier onlyTask() {
        require(msg.sender == address(primusTask), "Only task contract");
        _;
    }
    
    constructor(
        address _registry,
        address _primusTask
    ) {
        owner = msg.sender;
        registry = VeritasValidationRegistryV4(_registry);
        primusTask = IPrimusTask(_primusTask);
    }
    
    // ============================================
    // ADMIN
    // ============================================
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    // ============================================
    // RULE MANAGEMENT
    // ============================================
    
    function addRule(
        string calldata templateId,
        string calldata dataKey,
        uint8 decimals,
        uint256 maxAge,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;
        rules[ruleId] = VerificationRule({
            templateId: templateId,
            dataKey: dataKey,
            decimals: decimals,
            maxAge: maxAge,
            active: true,
            description: description
        });
        emit RuleAdded(ruleId, templateId);
    }
    
    function addCheck(
        uint256 ruleId,
        address checkContract,
        bytes calldata params,
        int128 score
    ) external onlyOwner returns (uint256 checkId) {
        checkId = checkCount[ruleId]++;
        checks[ruleId][checkId] = CustomCheck({
            checkContract: checkContract,
            params: params,
            score: score,
            active: true
        });
        emit CheckAdded(ruleId, checkId, score);
    }
    
    // ============================================
    // VALIDATION REQUEST
    // ============================================
    
    /**
     * @notice Request validation with Primus callback
     * @dev Submits task to Primus with THIS CONTRACT as callback address
     * @param agentId The agent to validate
     * @param ruleId The verification rule to use
     * @param checkIds Specific checks to run (empty for all)
     * @param attestorCount Number of attestors to request
     */
    function requestValidation(
        uint256 agentId,
        uint256 ruleId,
        uint256[] calldata checkIds,
        uint256 attestorCount
    ) external payable returns (bytes32 taskId) {
        VerificationRule storage rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        
        // Calculate fee
        FeeInfo memory feeInfo = primusTask.queryLatestFeeInfo(TokenSymbol.ETH);
        uint256 totalFee = (feeInfo.primusFee + feeInfo.attestorFee) * attestorCount;
        require(msg.value >= totalFee, "Insufficient fee");
        
        // Submit task to Primus with THIS CONTRACT as callback
        // This is the key: Primus will call reportTaskResultCallback on this contract
        taskId = primusTask.submitTask{value: totalFee}(
            msg.sender,           // sender (original requester)
            rule.templateId,      // templateId (e.g., Coinbase BTC URL)
            attestorCount,        // number of attestors
            TokenSymbol.ETH,      // fee token
            address(this)         // ← CALLBACK: this contract receives the result
        );
        
        // Store pending validation details
        PendingValidation storage pending = pendingValidations[taskId];
        pending.ruleId = ruleId;
        pending.agentId = agentId;
        pending.requester = msg.sender;
        for (uint256 i = 0; i < checkIds.length; i++) {
            pending.checkIds.push(checkIds[i]);
        }
        
        emit ValidationRequested(taskId, ruleId, agentId);
        
        // Refund excess
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }
        
        return taskId;
    }
    
    // ============================================
    // PRIMUS CALLBACK - Called by Primus Task contract
    // ============================================
    
    /**
     * @notice Called by Primus Task contract when attestation is complete
     * @dev This is the REAL callback from Primus - matches IPrimusNetworkCallback
     * @param taskId The task identifier (returned from submitTask)
     * @param taskResult The full attestation result from Primus
     * @param success Whether the attestation succeeded
     */
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external onlyTask {
        // Log the callback attempt for debugging
        uint256 attemptId = callbackAttemptCount++;
        callbackAttempts[attemptId] = CallbackAttempt({
            caller: msg.sender,
            taskId: taskId,
            attestor: taskResult.attestor,
            data: taskResult.attestation.data,
            blockTime: block.timestamp,
            success: success
        });
        
        emit CallbackReceived(taskId, msg.sender, taskResult.attestor);
        
        // Don't process if failed or already processed
        if (!success) {
            return;
        }
        
        if (processedTasks[taskId]) {
            return;
        }
        
        // Mark as processed
        processedTasks[taskId] = true;
        
        // Get pending validation details
        PendingValidation storage pending = pendingValidations[taskId];
        uint256 ruleId = pending.ruleId;
        
        // If no pending validation found, use rule 0 as default
        if (pending.requester == address(0)) {
            ruleId = 0;
        }
        
        VerificationRule storage rule = rules[ruleId];
        if (!rule.active) {
            return; // Silently fail if rule inactive
        }
        
        // Verify freshness
        if (block.timestamp - taskResult.attestation.timestamp > rule.maxAge) {
            return; // Expired
        }
        
        // Determine which checks to run
        uint256[] memory checkIds = pending.checkIds.length > 0 
            ? pending.checkIds 
            : _getAllCheckIds(ruleId);
        
        // Run custom checks
        int128 totalScore = 0;
        int128 maxScore = 0;
        
        for (uint256 i = 0; i < checkIds.length; i++) {
            CustomCheck storage check = checks[ruleId][checkIds[i]];
            if (!check.active) continue;
            
            maxScore += check.score;
            
            try ICustomCheck(check.checkContract).validate(
                rule.dataKey,
                taskResult.attestation.data,
                check.params
            ) returns (bool passed, int128 value) {
                if (passed) {
                    totalScore += check.score;
                    emit CheckPassed(ruleId, checkIds[i], check.score, value);
                } else {
                    emit CheckFailed(ruleId, checkIds[i]);
                }
            } catch {
                emit CheckFailed(ruleId, checkIds[i]);
            }
        }
        
        // Calculate 0-100 score
        uint8 response = maxScore > 0 
            ? uint8((uint256(int256(totalScore)) * 100) / uint256(int256(maxScore)))
            : 0;
        
        // Store result in Registry (best effort - don't revert if registry fails)
        try registry.validationResponse(
            taskId,
            response,
            _toHexString(taskId),
            keccak256(bytes(taskResult.attestation.data)),
            rule.description
        ) {
            // Registry call succeeded
        } catch {
            // Registry call failed - still emit completion event
        }
        
        emit ValidationCompleted(taskId, response);
    }
    
    // ============================================
    // FALLBACK: Manual processing
    // ============================================
    
    /**
     * @notice Process attestation manually (fallback if callback fails)
     * @dev Can be called by anyone with valid Primus attestation data
     * @param taskId The task ID
     * @param attestationData The JSON attestation data
     * @param timestamp The attestation timestamp
     * @param ruleId The rule to validate against
     */
    function processAttestation(
        bytes32 taskId,
        string calldata attestationData,
        uint64 timestamp,
        uint256 ruleId
    ) external {
        require(!processedTasks[taskId], "Already processed");
        
        // Verify this task was submitted and get details
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        require(taskInfo.submitter != address(0), "Task not found");
        require(taskInfo.callback == address(this), "Wrong callback contract");
        
        // Verify at least one attestor has reported
        require(taskInfo.taskResults.length > 0, "No results yet");
        
        // Mark as processed
        processedTasks[taskId] = true;
        
        _processAttestation(taskId, attestationData, timestamp, ruleId);
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
        
        emit ValidationCompleted(taskId, response);
    }
    
    // ============================================
    // INTERNAL HELPERS
    // ============================================
    
    function _getAllCheckIds(uint256 ruleId) internal view returns (uint256[] memory) {
        uint256 count = checkCount[ruleId];
        uint256[] memory ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = i;
        }
        return ids;
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
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getCallbackAttempt(uint256 attemptId) external view returns (CallbackAttempt memory) {
        return callbackAttempts[attemptId];
    }
    
    function getPendingValidation(bytes32 taskId) external view returns (PendingValidation memory) {
        return pendingValidations[taskId];
    }
}
