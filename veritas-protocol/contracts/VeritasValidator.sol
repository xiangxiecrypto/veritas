// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Primus structs (same as before)
struct AttNetworkRequest {
    string url;
    string header;
    string method;
    string body;
}

struct AttNetworkOneUrlResponseResolve {
    // Simplified
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
    function queryTask(bytes32 taskId) external view returns (TaskInfo memory taskInfo);
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
 * @title VeritasValidator
 * @notice Generic validator supporting multiple app contracts
 * @dev App contracts call this for verification and reputation
 */
contract VeritasValidator {
    address public owner;
    IPrimusTaskContract public immutable primusTask;
    IReputationRegistry public immutable reputation;
    
    // Authorized app contracts
    mapping(address => bool) public authorizedApps;
    
    // Anti-replay
    mapping(bytes32 => bool) public usedTaskIds;
    
    // Events
    event AppAuthorized(address indexed app, bool authorized);
    event AttestationValidated(
        address indexed app,
        uint256 indexed agentId,
        bytes32 indexed taskId,
        string url,
        int128 score,
        bool success
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorizedApp() {
        require(authorizedApps[msg.sender], "Not authorized app");
        _;
    }
    
    constructor(
        address _primusTask,
        address _reputation
    ) {
        owner = msg.sender;
        primusTask = IPrimusTaskContract(_primusTask);
        reputation = IReputationRegistry(_reputation);
    }
    
    /**
     * @notice Authorize or deauthorize an app contract
     */
    function setAppAuthorization(address app, bool authorized) external onlyOwner {
        authorizedApps[app] = authorized;
        emit AppAuthorized(app, authorized);
    }
    
    /**
     * @notice Validate attestation (called by authorized app contracts)
     * @param agentId Agent to credit
     * @param taskId Primus task ID
     * @param expectedUrl Expected URL
     * @param expectedDataHash Expected data hash (0 for any)
     * @param maxAge Maximum age in seconds
     * @param score Reputation score to grant
     * @param scoreDecimals Score decimals
     * @return success Whether validation succeeded
     */
    function validateAndGrant(
        uint256 agentId,
        bytes32 taskId,
        string calldata expectedUrl,
        bytes32 expectedDataHash,
        uint256 maxAge,
        int128 score,
        uint8 scoreDecimals
    ) external onlyAuthorizedApp returns (bool) {
        // Anti-replay
        require(!usedTaskIds[taskId], "Already validated");
        usedTaskIds[taskId] = true;
        
        // Fetch attestation
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        require(taskInfo.taskResults.length > 0, "No attestation");
        
        Attestation memory att = taskInfo.taskResults[0].attestation;
        require(att.request.length > 0, "No request");
        
        // Verify URL
        require(
            keccak256(bytes(att.request[0].url)) == keccak256(bytes(expectedUrl)),
            "URL mismatch"
        );
        
        // Verify data hash (if specified)
        if (expectedDataHash != bytes32(0)) {
            require(
                keccak256(bytes(att.data)) == expectedDataHash,
                "Data mismatch"
            );
        }
        
        // Verify freshness
        uint256 age = block.timestamp - att.timestamp;
        require(age <= maxAge, "Expired");
        
        // Grant reputation
        reputation.giveFeedback(
            agentId,
            score,
            scoreDecimals,
            "veritas-validator",
            expectedUrl,
            expectedUrl,
            att.data,
            taskId
        );
        
        emit AttestationValidated(
            msg.sender,
            agentId,
            taskId,
            expectedUrl,
            score,
            true
        );
        
        return true;
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
