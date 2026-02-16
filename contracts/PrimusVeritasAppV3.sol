// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrimusTaskInterface.sol";
import "./VeritasValidationRegistryV3.sol";

/**
 * @title IIdentityRegistry
 * @notice Minimal ERC-8004 IdentityRegistry interface
 */
interface IIdentityRegistry {
    function ownerOf(uint256 agentId) external view returns (address owner);
}

/**
 * @title PrimusVeritasAppV3
 * @notice Simplified app - no validation logic, just manages rules and requests
 * @dev All validation (including custom checks) happens in ValidationRegistryV3
 */
contract PrimusVeritasAppV3 {
    address public owner;
    IPrimusTaskContract public immutable primusTask;
    VeritasValidationRegistryV3 public immutable registry;
    IIdentityRegistry public immutable identityRegistry;
    address public reputationRegistry;
    
    uint256 public constant PRIMUS_FEE = 10000000000; // 10^10 wei
    
    // ============================================
    // DATA STRUCTURES
    // ============================================
    
    struct VerificationRule {
        bytes32 urlHash;
        string url;
        string dataKey;
        uint8 decimals;
        uint256 maxAge;
        bool active;
        string description;
    }
    
    struct VerificationRequest {
        uint256 ruleId;
        uint256 agentId;
        address requester;
        uint256[] checkIds;
        bool completed;
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    mapping(uint256 => VerificationRule) public rules;
    uint256 public ruleCount;
    
    mapping(bytes32 => VerificationRequest) public requests;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event RuleAdded(uint256 indexed ruleId, string url, string dataKey);
    event VerificationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId, uint256[] checkIds);
    event VerificationCompleted(bytes32 indexed taskId, uint256 indexed agentId, int128 totalScore);
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _primusTask,
        address _registry,
        address _reputationRegistry,
        address _identityRegistry
    ) {
        owner = msg.sender;
        primusTask = IPrimusTaskContract(_primusTask);
        registry = VeritasValidationRegistryV3(_registry);
        reputationRegistry = _reputationRegistry;
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }
    
    // ============================================
    // RULE MANAGEMENT
    // ============================================
    
    /**
     * @notice Add a new verification rule
     * @dev Also registers with ValidationRegistry
     */
    function addRule(
        string calldata url,
        string calldata dataKey,
        uint8 decimals,
        uint256 maxAge,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;
        bytes32 urlHash = keccak256(bytes(url));
        
        rules[ruleId] = VerificationRule({
            urlHash: urlHash,
            url: url,
            dataKey: dataKey,
            decimals: decimals,
            maxAge: maxAge,
            active: true,
            description: description
        });
        
        // Register with ValidationRegistry
        registry.registerRule(ruleId, urlHash, dataKey, decimals, maxAge);
        
        emit RuleAdded(ruleId, url, dataKey);
    }
    
    /**
     * @notice Add a custom check to a rule
     * @dev Forwards to ValidationRegistry
     */
    function addCheck(
        uint256 ruleId,
        address checkContract,
        bytes calldata params,
        int128 score,
        string calldata description
    ) external onlyOwner returns (uint256 checkId) {
        return registry.addCheck(ruleId, checkContract, params, score, description);
    }
    
    // ============================================
    // VERIFICATION REQUEST
    // ============================================
    
    /**
     * @notice Request verification with specific custom checks
     * @param ruleId The rule to verify against
     * @param agentId The agent to credit reputation to
     * @param checkIds Array of check IDs to prove (empty = no checks, no score)
     */
    function requestVerification(
        uint256 ruleId,
        uint256 agentId,
        uint256[] calldata checkIds
    ) external payable returns (bytes32 taskId) {
        // Verify ownership
        address agentOwner = identityRegistry.ownerOf(agentId);
        require(msg.sender == agentOwner, "Not agent owner");
        
        // Verify rule active
        require(rules[ruleId].active, "Rule inactive");
        
        // Verify fee
        require(msg.value == PRIMUS_FEE, "Fee must be 10^10 wei");
        
        // Submit to Primus
        taskId = primusTask.submitTask{value: msg.value}(
            msg.sender,
            rules[ruleId].url,
            1,
            TokenSymbol.ETH,
            address(this)
        );
        
        // Store request
        VerificationRequest storage req = requests[taskId];
        req.ruleId = ruleId;
        req.agentId = agentId;
        req.requester = msg.sender;
        req.completed = false;
        
        // Copy checkIds to storage
        for (uint256 i = 0; i < checkIds.length; i++) {
            req.checkIds.push(checkIds[i]);
        }
        
        emit VerificationRequested(taskId, ruleId, agentId, checkIds);
    }
    
    /**
     * @notice Request verification without custom checks (basic)
     * @dev No score will be awarded, just attestation proof
     */
    function requestVerificationBasic(
        uint256 ruleId,
        uint256 agentId
    ) external payable returns (bytes32 taskId) {
        // Verify ownership
        address agentOwner = identityRegistry.ownerOf(agentId);
        require(msg.sender == agentOwner, "Not agent owner");
        
        // Verify rule active
        require(rules[ruleId].active, "Rule inactive");
        
        // Verify fee
        require(msg.value == PRIMUS_FEE, "Fee must be 10^10 wei");
        
        // Submit to Primus
        taskId = primusTask.submitTask{value: msg.value}(
            msg.sender,
            rules[ruleId].url,
            1,
            TokenSymbol.ETH,
            address(this)
        );
        
        // Store request (no checkIds)
        VerificationRequest storage req = requests[taskId];
        req.ruleId = ruleId;
        req.agentId = agentId;
        req.requester = msg.sender;
        req.completed = false;
        
        // Empty checkIds - no custom checks
        
        emit VerificationRequested(taskId, ruleId, agentId, new uint256[](0));
    }
    
    // ============================================
    // SUBMIT ATTESTATION
    // ============================================
    
    /**
     * @notice Submit attestation to contract for validation
     * @dev Called after SDK.attest() completes
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
        
        // Query Primus to verify attestation
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        require(taskInfo.taskStatus == 1, "Task not completed");
        require(taskInfo.callback == address(this), "Not our task");
        require(taskInfo.taskResults.length > 0, "No attestation");
        
        // Verify URL matches
        require(
            keccak256(bytes(taskInfo.templateId)) == keccak256(bytes(attestationUrl)),
            "URL mismatch"
        );
        
        // Verify data matches
        TaskResult memory result = taskInfo.taskResults[0];
        require(
            keccak256(bytes(result.attestation.data)) == keccak256(bytes(attestationData)),
            "Data mismatch"
        );
        
        // Get rule
        VerificationRule storage rule = rules[req.ruleId];
        
        // Prepare validation params
        VeritasValidationRegistryV3.ValidationParams memory params = VeritasValidationRegistryV3.ValidationParams({
            ruleId: req.ruleId,
            agentId: req.agentId,
            taskId: taskId,
            attestationUrl: attestationUrl,
            attestationData: attestationData,
            attestationTimestamp: attestationTimestamp,
            checkIds: req.checkIds,
            reputationRegistry: reputationRegistry
        });
        
        // Call ValidationRegistry - all validation happens there
        (, int128 totalScore) = registry.validateAttestation(params);
        
        // Mark completed
        req.completed = true;
        
        emit VerificationCompleted(taskId, req.agentId, totalScore);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getRule(uint256 ruleId) external view returns (
        string memory url,
        string memory dataKey,
        uint8 decimals,
        uint256 maxAge,
        bool active,
        string memory description
    ) {
        VerificationRule storage rule = rules[ruleId];
        return (rule.url, rule.dataKey, rule.decimals, rule.maxAge, rule.active, rule.description);
    }
    
    function getRequest(bytes32 taskId) external view returns (
        uint256 ruleId,
        uint256 agentId,
        address requester,
        uint256[] memory checkIds,
        bool completed
    ) {
        VerificationRequest storage req = requests[taskId];
        return (req.ruleId, req.agentId, req.requester, req.checkIds, req.completed);
    }
    
    // ============================================
    // ADMIN
    // ============================================
    
    function setReputationRegistry(address _reputationRegistry) external onlyOwner {
        reputationRegistry = _reputationRegistry;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
