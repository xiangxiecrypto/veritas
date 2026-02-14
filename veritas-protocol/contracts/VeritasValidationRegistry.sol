// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Exact structs from IPrimusZKTLS.sol and ITask.sol
struct AttNetworkRequest {
    string url;
    string header;
    string method;
    string body;
}

struct AttNetworkResponseResolve {
    string keyName;
    string parseType;
    string parsePath;
}

struct AttNetworkOneUrlResponseResolve {
    AttNetworkResponseResolve[] oneUrlResponseResolve;
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

enum TaskStatus { INIT, SUCCESS, PARTIAL_SUCCESS, PARTIAL_SUCCESS_SETTLED, FAILED }
enum TokenSymbol { ETH }

struct TaskInfo {
    string templateId;
    address submitter;
    address[] attestors;
    TaskResult[] taskResults;
    uint64 submittedAt;
    TokenSymbol tokenSymbol;
    address callback;
    TaskStatus taskStatus;
}

interface IPrimusTaskContract {
    function queryTask(bytes32 taskId) external view returns (TaskInfo memory taskInfo);
}

interface IERC8004IdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getAgentWallet(uint256 agentId) external view returns (address);
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
 * @title VeritasValidationRegistry
 * @notice Validates Primus attestations by fetching on-chain and verifying metadata
 * @dev Wallet only sends metadata (taskId + hashes), contract fetches actual data from Primus
 */
contract VeritasValidationRegistry {
    IERC8004IdentityRegistry public immutable identityRegistry;
    IReputationRegistry public immutable reputationRegistry;
    IPrimusTaskContract public immutable primusTaskContract;
    
    mapping(bytes32 => bool) public usedTaskIds;
    uint256 public constant MAX_AGE = 1 hours;
    
    event AttestationValidated(
        uint256 indexed agentId,
        bytes32 indexed taskId,
        address indexed recipient,
        string apiUrl,
        bytes32 dataHash,
        uint64 timestamp,
        bool success
    );
    
    event ReputationGranted(uint256 indexed agentId, int128 score, bytes32 taskId);
    
    constructor(
        address _identityRegistry,
        address _reputationRegistry,
        address _primusTaskContract
    ) {
        identityRegistry = IERC8004IdentityRegistry(_identityRegistry);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        primusTaskContract = IPrimusTaskContract(_primusTaskContract);
    }
    
    modifier onlyAgentOwner(uint256 agentId) {
        require(
            msg.sender == identityRegistry.ownerOf(agentId) || 
            msg.sender == identityRegistry.getAgentWallet(agentId),
            "Not agent owner"
        );
        _;
    }
    
    /**
     * @notice Validate an attestation by fetching from Primus on-chain
     * @param agentId The agent to credit
     * @param taskId The Primus task ID
     * @param expectedUrlHash keccak256 of the expected API URL
     * @param expectedDataHash keccak256 of the expected attestation data
     */
    function validateAttestation(
        uint256 agentId,
        bytes32 taskId,
        bytes32 expectedUrlHash,
        bytes32 expectedDataHash
    ) external onlyAgentOwner(agentId) returns (bool) {
        
        // Anti-replay
        require(!usedTaskIds[taskId], "Already validated");
        usedTaskIds[taskId] = true;
        
        // Fetch attestation from Primus on-chain
        TaskInfo memory taskInfo = primusTaskContract.queryTask(taskId);
        require(taskInfo.taskResults.length > 0, "No attestation");
        
        Attestation memory att = taskInfo.taskResults[0].attestation;
        require(att.request.length > 0, "No request");
        
        // Verify recipient
        require(att.recipient == msg.sender, "Recipient mismatch");
        
        // Verify URL hash
        require(keccak256(bytes(att.request[0].url)) == expectedUrlHash, "URL mismatch");
        
        // Verify data hash
        require(keccak256(bytes(att.data)) == expectedDataHash, "Data mismatch");
        
        // Verify freshness
        uint256 ts = att.timestamp > 1e12 ? att.timestamp / 1000 : att.timestamp;
        require(block.timestamp - ts <= MAX_AGE, "Expired");
        
        // Emit event
        emit AttestationValidated(
            agentId,
            taskId,
            att.recipient,
            att.request[0].url,
            keccak256(bytes(att.data)),
            att.timestamp,
            true
        );
        
        // Grant reputation
        reputationRegistry.giveFeedback(
            agentId,
            95,
            0,
            "primus-zktls",
            att.request[0].url,
            att.request[0].url,
            att.data,
            taskId
        );
        
        emit ReputationGranted(agentId, 95, taskId);
        
        return true;
    }
}
