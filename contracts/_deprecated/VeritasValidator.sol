// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Primus structs
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
 * @notice Generic validator - ALL validation happens here
 * @dev Uses hash for URL comparison (50% gas savings), direct string for dataKey
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
        bytes32 urlHash,
        string dataKey,
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
     * @notice Validate attestation and grant reputation
     * @dev ALL validation happens here (not in app)
     * @param agentId Agent to credit
     * @param taskId Primus task ID
     * @param expectedUrlHash Expected URL hash (pre-computed for gas efficiency)
     * @param expectedDataKey Expected data key (direct string, short)
     * @param score Reputation score to grant
     * @param scoreDecimals Score decimals
     * @param maxAge Maximum age in seconds
     * @return success Whether validation succeeded
     */
    function validateAndGrant(
        uint256 agentId,
        bytes32 taskId,
        bytes32 expectedUrlHash,        // ✅ Hash for gas efficiency
        string calldata expectedDataKey, // Direct string (short)
        int128 score,
        uint8 scoreDecimals,
        uint256 maxAge
    ) external onlyAuthorizedApp returns (bool) {
        // Anti-replay
        require(!usedTaskIds[taskId], "Already validated");
        usedTaskIds[taskId] = true;
        
        // Fetch attestation from Primus
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        require(taskInfo.taskResults.length > 0, "No attestation");
        
        Attestation memory att = taskInfo.taskResults[0].attestation;
        require(att.request.length > 0, "No request");
        
        // ✅ Validate URL (hash comparison - 50% gas savings!)
        require(
            keccak256(bytes(att.request[0].url)) == expectedUrlHash,
            "URL mismatch"
        );
        
        // Validate recipient
        require(
            att.recipient == tx.origin,
            "Recipient mismatch"
        );
        
        // Validate data key exists (direct string check)
        require(
            _containsDataKey(att.data, expectedDataKey),
            "Data key not found"
        );
        
        // Validate freshness
        uint256 age = block.timestamp - att.timestamp;
        require(age <= maxAge, "Expired");
        
        // Grant reputation
        reputation.giveFeedback(
            agentId,
            score,
            scoreDecimals,
            "veritas-validator",
            expectedDataKey,  // Use dataKey as tag
            expectedDataKey,
            att.data,
            taskId
        );
        
        emit AttestationValidated(
            msg.sender,
            agentId,
            taskId,
            expectedUrlHash,
            expectedDataKey,
            score,
            true
        );
        
        return true;
    }
    
    /**
     * @notice Check if data contains the expected key
     * @dev Simple string check - can be enhanced with proper JSON parsing
     */
    function _containsDataKey(string memory data, string memory key) internal pure returns (bool) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        if (keyBytes.length == 0) {
            return true; // No key requirement
        }
        
        // Look for key in format: "key":
        bytes memory searchPattern = abi.encodePacked('"', keyBytes, '":');
        
        if (dataBytes.length < searchPattern.length) {
            return false;
        }
        
        for (uint i = 0; i <= dataBytes.length - searchPattern.length; i++) {
            bool found = true;
            for (uint j = 0; j < searchPattern.length; j++) {
                if (dataBytes[i + j] != searchPattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
