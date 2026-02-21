// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IVeritasApp.sol";
import "./VeritasValidationRegistryV2.sol";
import "./PrimusTaskInterface.sol";

/**
 * @title IIdentityRegistry
 * @notice Minimal ERC-8004 IdentityRegistry interface
 */
interface IIdentityRegistry {
    /**
     * @notice Check if agent is registered (reverts if not)
     * @param agentId The agent ID to check
     * @return owner The owner address of the agent
     */
    function ownerOf(uint256 agentId) external view returns (address owner);
}

/**
 * @title PrimusVeritasApp
 * @notice App that fetches attestation from Primus Network
 * @dev Uses callback pattern - Primus calls back when attestation is ready
 * @dev Only registered agents (ERC-8004) can build reputation
 */
contract PrimusVeritasAppV2 is IVeritasApp {
    address public owner;
    IPrimusTaskContract public immutable primusTask;
    VeritasValidationRegistryV2 public immutable registry;
    IIdentityRegistry public immutable identityRegistry;
    
    struct VerificationRule {
        bytes32 urlHash;
        string url;
        string dataKey;
        int128 score;
        uint8 decimals;
        uint256 maxAge;
        bool active;
        string description;
    }
    
    mapping(uint256 => VerificationRule) public rules;
    uint256 public ruleCount;
    
    struct VerificationRequest {
        uint256 ruleId;
        uint256 agentId;
        address requester;
        bool completed;
    }
    
    mapping(bytes32 => VerificationRequest) public requests;
    
    address public reputationRegistry;
    
    // Events
    event RuleAdded(uint256 indexed ruleId, string url, string dataKey, int128 score);
    event VerificationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId);
    event VerificationCompleted(bytes32 indexed taskId, uint256 indexed agentId, int128 score);
    event CallbackFailed(bytes32 indexed taskId, string reason);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(
        address _primusTask,
        address _registry,
        address _reputationRegistry,
        address _identityRegistry
    ) {
        owner = msg.sender;
        primusTask = IPrimusTaskContract(_primusTask);
        registry = VeritasValidationRegistryV2(_registry);
        reputationRegistry = _reputationRegistry;
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }
    
    // ============================================
    // RULE MANAGEMENT
    // ============================================
    
    function addRule(
        string calldata url,
        string calldata dataKey,
        int128 score,
        uint8 decimals,
        uint256 maxAge,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;
        
        rules[ruleId] = VerificationRule({
            urlHash: keccak256(bytes(url)),
            url: url,
            dataKey: dataKey,
            score: score,
            decimals: decimals,
            maxAge: maxAge,
            active: true,
            description: description
        });
        
        emit RuleAdded(ruleId, url, dataKey, score);
    }
    
    function setRuleActive(uint256 ruleId, bool active) external onlyOwner {
        rules[ruleId].active = active;
    }
    
    function setReputationRegistry(address _reputationRegistry) external onlyOwner {
        reputationRegistry = _reputationRegistry;
    }
    
    // ============================================
    // VERIFICATION FLOW - CALLBACK PATTERN
    // ============================================
    
    /**
     * @notice Request verification - creates a Primus task with callback
     * @dev Primus will call back to this contract when attestation is ready
     * @dev Only the agent owner (ERC-8004) can request verification for their agent
     * @param ruleId Which rule to verify against
     * @param agentId Agent to credit reputation to (caller must be owner)
     * @return taskId The Primus task ID
     */
    function requestVerification(
        uint256 ruleId,
        uint256 agentId
    ) external payable returns (bytes32 taskId) {
        VerificationRule memory rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        
        // ✅ CHECK: Caller must be the agent owner in IdentityRegistry (ERC-8004)
        address agentOwner = identityRegistry.ownerOf(agentId);
        require(msg.sender == agentOwner, "Not agent owner");
        
        // Submit task to Primus with callback to THIS contract
        // When attestation is ready, Primus will call our callback function
        taskId = primusTask.submitTask{value: msg.value}(
            msg.sender,           // sender (user who requested)
            rule.url,             // templateId (URL to attest)
            1,                    // attestorCount
            TokenSymbol.ETH,      // tokenSymbol
            address(this)         // callback = THIS contract! ✅
        );
        
        // Track request
        requests[taskId] = VerificationRequest({
            ruleId: ruleId,
            agentId: agentId,
            requester: msg.sender,
            completed: false
        });
        
        emit VerificationRequested(taskId, ruleId, agentId);
    }
    
    // ============================================
    // WITHDRAW - Trigger callback by settling task
    // ============================================
    
    /**
     * @notice Withdraw balance and trigger callbacks for completed tasks
     * @dev Primus only triggers callback during withdrawBalance()
     * @param tokenSymbol Token to withdraw
     * @param limit Maximum number of tasks to settle
     */
    function withdrawAndSettle(uint8 tokenSymbol, uint256 limit) external {
        // This calls withdrawBalance which triggers callbacks
        primusTask.withdrawBalance(TokenSymbol.ETH, limit);
    }
    
    /**
     * @notice Withdraw for a specific task
     * @dev Calls withdrawBalance with limit=1 for a specific task
     */
    function withdrawForTask(bytes32 taskId) external {
        // Only allow withdrawing for our own tasks
        require(requests[taskId].requester != address(0), "Not our task");
        primusTask.withdrawBalance(TokenSymbol.ETH, 1);
    }
    
    /**
     * @notice Settle a verification request to trigger the callback
     * @dev Primus only triggers callback during withdrawBalance()
     * @param taskId The task ID to settle
     */
    function settleVerification(bytes32 taskId) external {
        VerificationRequest storage req = requests[taskId];
        require(req.requester != address(0), "Request not found");
        require(!req.completed, "Already completed");
        
        // Call withdrawBalance on Primus to settle the task
        // This will trigger the callback to onAttestationComplete
        primusTask.withdrawBalance(TokenSymbol.ETH, 1);
    }
    
    /**
     * @notice Batch settle multiple verification requests
     * @param taskIds Array of task IDs to settle
     */
    function settleVerificationBatch(bytes32[] calldata taskIds) external {
        for (uint256 i = 0; i < taskIds.length; i++) {
            VerificationRequest storage req = requests[taskIds[i]];
            if (req.requester != address(0) && !req.completed) {
                // Just check, don't require
            }
        }
        // Withdraw all pending tasks
        primusTask.withdrawBalance(TokenSymbol.ETH, 100);
    }
    
    // ============================================
    // CALLBACK - Called by Primus when attestation is ready
    // ============================================
    
    /**
     * @notice Callback function called by Primus when attestation is complete
     * @dev This is the function Primus calls after zkTLS attestation is done
     * @param taskId The task ID that was completed
     * @param taskResult The attestation result from Primus
     */
    function onAttestationComplete(
        bytes32 taskId,
        TaskResult calldata taskResult
    ) external {
        // Only Primus TaskContract should call this
        require(msg.sender == address(primusTask), "Only Primus");
        
        // Get stored request
        VerificationRequest storage req = requests[taskId];
        require(!req.completed, "Already completed");
        require(req.requester != address(0), "Request not found");
        
        // Get rule
        VerificationRule memory rule = rules[req.ruleId];
        require(rule.active, "Rule inactive");
        
        // Extract attestation data
        Attestation memory att = taskResult.attestation;
        string memory attestationUrl = _decodeRequestUrl(att.request);
        
        // Validate and grant reputation via Registry
        VeritasValidationRegistryV2.ValidationParams memory params = VeritasValidationRegistryV2.ValidationParams({
            agentId: req.agentId,
            taskId: taskId,
            appContract: address(this),
            ruleId: req.ruleId,
            attestationUrl: attestationUrl,
            attestationData: att.data,
            attestationTimestamp: att.timestamp,
            expectedUrlHash: rule.urlHash,
            expectedDataKey: rule.dataKey,
            score: rule.score,
            decimals: rule.decimals,
            maxAge: rule.maxAge,
            reputationRegistry: reputationRegistry
        });
        registry.validateAttestation(params);
        
        // Mark completed
        req.completed = true;
        
        emit VerificationCompleted(taskId, req.agentId, rule.score);
    }
    
    /**
     * @notice Submit attestation directly (for SDK integration)
     * @dev Called by anyone after SDK.attest() completes
     * @dev Queries Primus to verify attestation is real
     */
    function submitAttestation(
        bytes32 taskId,
        string calldata attestationUrl,
        string calldata attestationData,
        uint64 attestationTimestamp
    ) external {
        VerificationRequest storage req = requests[taskId];
        require(!req.completed, "Already completed");
        require(req.requester != address(0), "Request not found");
        
        // Query Primus to verify attestation exists and matches
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        require(taskInfo.taskStatus == 1, "Task not completed");
        require(taskInfo.callback == address(this), "Not our task");
        require(taskInfo.taskResults.length > 0, "No attestation");
        
        // Verify the attestation data matches
        TaskResult memory result = taskInfo.taskResults[0];
        Attestation memory att = result.attestation;
        
        // Verify URL matches (use templateId, not att.request)
        require(
            keccak256(bytes(taskInfo.templateId)) == keccak256(bytes(attestationUrl)),
            "URL mismatch"
        );
        
        // Verify data matches
        require(
            keccak256(bytes(att.data)) == keccak256(bytes(attestationData)),
            "Data mismatch"
        );
        
        // Get rule
        VerificationRule memory rule = rules[req.ruleId];
        require(rule.active, "Rule inactive");
        
        // Validate and grant reputation via Registry
        VeritasValidationRegistryV2.ValidationParams memory params = VeritasValidationRegistryV2.ValidationParams({
            agentId: req.agentId,
            taskId: taskId,
            appContract: address(this),
            ruleId: req.ruleId,
            attestationUrl: attestationUrl,
            attestationData: attestationData,
            attestationTimestamp: attestationTimestamp,
            expectedUrlHash: rule.urlHash,
            expectedDataKey: rule.dataKey,
            score: rule.score,
            decimals: rule.decimals,
            maxAge: rule.maxAge,
            reputationRegistry: reputationRegistry
        });
        registry.validateAttestation(params);
        
        // Mark completed
        req.completed = true;
        
        emit VerificationCompleted(taskId, req.agentId, rule.score);
    }
    
    /**
     * @notice Alternative callback - handles generic bytes data
     * @dev Some implementations use bytes instead of struct
     */
    function onTaskComplete(bytes32 taskId, bytes calldata data) external {
        require(msg.sender == address(primusTask), "Only Primus");
        
        // Decode the data if needed
        // This is a fallback for different callback formats
        
        VerificationRequest storage req = requests[taskId];
        require(!req.completed, "Already completed");
        require(req.requester != address(0), "Request not found");
        
        // Query the task to get full result
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        require(taskInfo.taskResults.length > 0, "No attestation");
        
        TaskResult memory taskResult = taskInfo.taskResults[0];
        Attestation memory att = taskResult.attestation;
        string memory attestationUrl = _decodeRequestUrl(att.request);
        
        VerificationRule memory rule = rules[req.ruleId];
        require(rule.active, "Rule inactive");

        VeritasValidationRegistryV2.ValidationParams memory params = VeritasValidationRegistryV2.ValidationParams({
            agentId: req.agentId,
            taskId: taskId,
            appContract: address(this),
            ruleId: req.ruleId,
            attestationUrl: attestationUrl,
            attestationData: att.data,
            attestationTimestamp: att.timestamp,
            expectedUrlHash: rule.urlHash,
            expectedDataKey: rule.dataKey,
            score: rule.score,
            decimals: rule.decimals,
            maxAge: rule.maxAge,
            reputationRegistry: reputationRegistry
        });
        registry.validateAttestation(params);
        
        req.completed = true;
        
        emit VerificationCompleted(taskId, req.agentId, rule.score);
    }
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    /**
     * @notice Decode request bytes to extract URL
     */
    function _decodeRequestUrl(bytes memory requestBytes) internal pure returns (string memory url) {
        if (requestBytes.length == 0) {
            return "";
        }
        // ABI decode: (string url, string header, string method, string body)
        (url, , , ) = abi.decode(requestBytes, (string, string, string, string));
    }
    
    // ============================================
    // CUSTOM CHECK (default: no check)
    // ============================================
    
    function customCheck(
        uint256 /* ruleId */,
        string calldata /* attestationUrl */,
        string calldata /* attestationData */,
        uint64 /* attestationTimestamp */
    ) external override returns (bool) {
        // Default: no custom check
        return true;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
