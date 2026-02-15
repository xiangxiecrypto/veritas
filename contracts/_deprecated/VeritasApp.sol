// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import Primus structs
struct AttNetworkRequest {
    string url;
    string header;
    string method;
    string body;
}

struct AttNetworkOneUrlResponseResolve {
    string placeholder; // Placeholder for empty struct
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
    function validateAndGrant(
        uint256 agentId,
        bytes32 taskId,
        bytes32 expectedUrlHash,        // ✅ Hash for gas efficiency
        string calldata expectedDataKey, // Direct string (short)
        int128 score,
        uint8 scoreDecimals,
        uint256 maxAge
    ) external returns (bool);
}

/**
 * @title VeritasApp
 * @notice Orchestration contract for zkTLS verification
 * @dev Uses hash for URL (gas optimized), direct string for dataKey
 */
contract VeritasApp {
    address public owner;
    IPrimusTaskContract public immutable primusTask;
    IVeritasValidator public immutable validator;
    
    // Verification rules (hash for URL, direct for dataKey)
    struct VerificationRule {
        bytes32 urlHash;            // ✅ Hash of URL (32 bytes, gas efficient)
        string url;                 // Full URL (for events/UI, optional)
        string dataKey;             // JSON key (short string, direct compare)
        int128 reputationScore;     // Score to grant
        uint8 scoreDecimals;        // Decimals (0 = integer)
        uint256 maxAgeSeconds;      // Freshness requirement
        bool active;
        string description;         // Human-readable description
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
        bytes32 indexed urlHash,    // ✅ Index by hash for efficient filtering
        string url,
        string dataKey,
        int128 score,
        string description
    );
    
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
        int128 score
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(
        address _primusTask,
        address _validator
    ) {
        owner = msg.sender;
        primusTask = IPrimusTaskContract(_primusTask);
        validator = IVeritasValidator(_validator);
    }
    
    /**
     * @notice Add verification rule
     * @param url URL to verify (will be hashed)
     * @param dataKey JSON key to extract (short string, stored directly)
     * @param reputationScore Score to grant
     * @param scoreDecimals Decimals (0 = integer)
     * @param maxAgeSeconds Maximum age in seconds
     * @param description Human-readable description
     */
    function addRule(
        string calldata url,
        string calldata dataKey,
        int128 reputationScore,
        uint8 scoreDecimals,
        uint256 maxAgeSeconds,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;
        
        bytes32 urlHash = keccak256(bytes(url)); // ✅ Pre-compute hash (one-time)
        
        rules[ruleId] = VerificationRule({
            urlHash: urlHash,
            url: url,
            dataKey: dataKey,
            reputationScore: reputationScore,
            scoreDecimals: scoreDecimals,
            maxAgeSeconds: maxAgeSeconds,
            active: true,
            description: description
        });
        
        emit RuleAdded(ruleId, urlHash, url, dataKey, reputationScore, description);
    }
    
    /**
     * @notice Update rule active status
     */
    function setRuleActive(uint256 ruleId, bool active) external onlyOwner {
        rules[ruleId].active = active;
    }
    
    /**
     * @notice Request verification (single transaction)
     * @param ruleId Rule to verify against
     * @param agentId Agent to credit
     * @return taskId Primus task ID
     */
    function requestVerification(
        uint256 ruleId,
        uint256 agentId
    ) external payable returns (bytes32 taskId) {
        VerificationRule memory rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        
        // Build Primus request
        AttNetworkRequest[] memory requests_ = new AttNetworkRequest[](1);
        requests_[0] = AttNetworkRequest({
            url: rule.url,          // Use full URL for Primus
            header: "",
            method: "GET",
            body: ""
        });
        
        // Submit task to Primus
        address[] memory attestors = new address[](1);
        attestors[0] = address(0); // Use default attestor
        
        taskId = primusTask.submitTask{value: msg.value}(
            "",
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
        
        // Call validator to validate and grant reputation
        // Pass hash for URL (gas efficient), direct string for dataKey
        bool success = validator.validateAndGrant(
            req.agentId,
            taskId,
            rule.urlHash,           // ✅ Pass hash (32 bytes)
            rule.dataKey,           // Direct string (short)
            rule.reputationScore,
            rule.scoreDecimals,
            rule.maxAgeSeconds
        );
        
        require(success, "Validation failed");
        
        // Mark completed
        requests[taskId].completed = true;
        
        emit VerificationCompleted(
            taskId,
            req.ruleId,
            req.agentId,
            rule.reputationScore
        );
        
        return true;
    }
    
    /**
     * @notice Get rule details
     */
    function getRule(uint256 ruleId) external view returns (VerificationRule memory) {
        return rules[ruleId];
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
