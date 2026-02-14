// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import structs from Primus
struct AttNetworkRequest {
    string url;
    string header;
    string method;
    string body;
}

struct AttNetworkOneUrlResponseResolve {
    // Simplified for this example
}

struct Attestation {
    address recipient;
    AttNetworkRequest[] request;
    AttNetworkOneUrlResponseResolve[] responseResolve;
    string data;
    string attConditions;
    uint64 timestamp;
    string additionParams;
}

struct TaskResult {
    address attestor;
    bytes32 taskId;
    Attestation attestation;
}

struct TaskInfo {
    string templateId;
    address submitter;
    address[] attestors;
    TaskResult[] taskResults;
    uint64 submittedAt;
    uint8 tokenSymbol;
    address callback;
    uint8 taskStatus;
}

interface IPrimusTaskContract {
    function submitTask(
        string calldata templateId,
        address[] calldata attestors,
        AttNetworkRequest[] calldata requests,
        string calldata attConditions,
        string calldata additionParams
    ) external payable returns (bytes32 taskId);
    
    function queryTask(bytes32 taskId) external view returns (TaskInfo memory taskInfo);
}

interface IVeritasValidator {
    function validateAttestation(
        uint256 agentId,
        bytes32 taskId,
        address appContract,
        string calldata url,
        bytes32 dataHash,
        uint256 maxAge
    ) external returns (bool);
}

interface IReputationRegistry {
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;
}

/**
 * @title VeritasApp
 * @notice Orchestration contract for zkTLS verification with configurable rules
 * @dev Single wallet transaction → Full verification → Reputation granted
 */
contract VeritasApp {
    address public owner;
    IPrimusTaskContract public immutable primusTask;
    IVeritasValidator public immutable validator;
    IReputationRegistry public immutable reputation;
    
    // Verification rules
    struct VerificationRule {
        string url;                  // URL to verify
        string dataKey;              // JSON key to extract (e.g., "price")
        bytes32 expectedDataHash;    // Expected hash (0 = any data)
        int128 reputationScore;      // Score to grant (e.g., 95)
        uint8 scoreDecimals;         // Decimals (0 = integer)
        uint256 maxAgeSeconds;       // Freshness requirement
        bool active;
        string description;          // Human-readable description
    }
    
    mapping(uint256 => VerificationRule) public rules;
    uint256 public ruleCount;
    
    // Task tracking
    struct VerificationRequest {
        uint256 ruleId;
        uint256 agentId;
        address requester;
        bool completed;
    }
    
    mapping(bytes32 => VerificationRequest) public requests;
    
    // Events
    event RuleAdded(
        uint256 indexed ruleId,
        string url,
        string dataKey,
        int128 score,
        string description
    );
    
    event RuleUpdated(uint256 indexed ruleId, bool active);
    
    event VerificationRequested(
        bytes32 indexed taskId,
        uint256 indexed ruleId,
        uint256 indexed agentId,
        address requester
    );
    
    event VerificationCompleted(
        bytes32 indexed taskId,
        uint256 indexed ruleId,
        uint256 indexed agentId,
        int128 score,
        bool success
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(
        address _primusTask,
        address _validator,
        address _reputation
    ) {
        owner = msg.sender;
        primusTask = IPrimusTaskContract(_primusTask);
        validator = IVeritasValidator(_validator);
        reputation = IReputationRegistry(_reputation);
    }
    
    /**
     * @notice Add a new verification rule
     * @param url URL to verify
     * @param dataKey JSON key to extract
     * @param expectedDataHash Expected hash (0 for any)
     * @param reputationScore Score to grant
     * @param scoreDecimals Decimals (0 = integer)
     * @param maxAgeSeconds Maximum age in seconds
     * @param description Human-readable description
     */
    function addRule(
        string calldata url,
        string calldata dataKey,
        bytes32 expectedDataHash,
        int128 reputationScore,
        uint8 scoreDecimals,
        uint256 maxAgeSeconds,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;
        
        rules[ruleId] = VerificationRule({
            url: url,
            dataKey: dataKey,
            expectedDataHash: expectedDataHash,
            reputationScore: reputationScore,
            scoreDecimals: scoreDecimals,
            maxAgeSeconds: maxAgeSeconds,
            active: true,
            description: description
        });
        
        emit RuleAdded(ruleId, url, dataKey, reputationScore, description);
    }
    
    /**
     * @notice Update rule active status
     */
    function setRuleActive(uint256 ruleId, bool active) external onlyOwner {
        rules[ruleId].active = active;
        emit RuleUpdated(ruleId, active);
    }
    
    /**
     * @notice Request verification (wallet calls this once)
     * @param ruleId Rule to verify against
     * @param agentId Agent to credit
     * @return taskId Primus task ID
     */
    function requestVerification(
        uint256 ruleId,
        uint256 agentId
    ) external returns (bytes32 taskId) {
        VerificationRule memory rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        
        // Build Primus request
        AttNetworkRequest[] memory requests_ = new AttNetworkRequest[](1);
        requests_[0] = AttNetworkRequest({
            url: rule.url,
            header: "",
            method: "GET",
            body: ""
        });
        
        // Submit task to Primus
        address[] memory attestors = new address[](1);
        attestors[0] = address(0); // Use default attestor
        
        taskId = primusTask.submitTask{value: msg.value}(
            "", // templateId
            attestors,
            requests_,
            "",
            ""
        );
        
        // Track request
        requests[taskId] = VerificationRequest({
            ruleId: ruleId,
            agentId: agentId,
            requester: msg.sender,
            completed: false
        });
        
        emit VerificationRequested(taskId, ruleId, agentId, msg.sender);
    }
    
    /**
     * @notice Complete verification after attestation is on-chain
     * @param taskId Primus task ID
     */
    function completeVerification(bytes32 taskId) external returns (bool) {
        VerificationRequest memory req = requests[taskId];
        require(!req.completed, "Already completed");
        require(req.requester != address(0), "Request not found");
        
        VerificationRule memory rule = rules[req.ruleId];
        require(rule.active, "Rule inactive");
        
        // Fetch attestation from Primus
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        require(taskInfo.taskResults.length > 0, "No attestation");
        
        Attestation memory att = taskInfo.taskResults[0].attestation;
        require(att.request.length > 0, "No request");
        
        // Verify URL
        require(
            keccak256(bytes(att.request[0].url)) == keccak256(bytes(rule.url)),
            "URL mismatch"
        );
        
        // Verify recipient
        require(att.recipient == req.requester, "Recipient mismatch");
        
        // Verify data hash (if specified)
        if (rule.expectedDataHash != bytes32(0)) {
            require(
                keccak256(bytes(att.data)) == rule.expectedDataHash,
                "Data mismatch"
            );
        }
        
        // Verify freshness
        uint256 age = block.timestamp - att.timestamp;
        require(age <= rule.maxAgeSeconds, "Expired");
        
        // Mark completed
        requests[taskId].completed = true;
        
        // Grant reputation
        reputation.giveFeedback(
            req.agentId,
            rule.reputationScore,
            rule.scoreDecimals,
            "veritas-app",
            rule.url,
            rule.url,
            att.data,
            taskId
        );
        
        emit VerificationCompleted(
            taskId,
            req.ruleId,
            req.agentId,
            rule.reputationScore,
            true
        );
        
        return true;
    }
    
    /**
     * @notice Get rule details
     */
    function getRule(uint256 ruleId) external view returns (VerificationRule memory) {
        return rules[ruleId];
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
