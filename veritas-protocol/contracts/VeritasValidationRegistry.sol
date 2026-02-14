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

    address public owner;
    mapping(bytes32 => bool) public usedTaskIds;

    uint256 public constant MAX_AGE = 1 hours;

    // ⭐ Configurable Scoring System
    int128 public baseScore = 95;           // Default score for valid attestation
    uint8 public scoreDecimals = 0;         // 0 = integer (0-100 scale)

    // Freshness bonus thresholds (in seconds)
    uint256 public freshnessBonus1 = 10 minutes;  // 100 score if < 10min
    uint256 public freshnessBonus2 = 30 minutes;  // 98 score if < 30min

    int128 public constant SCORE_FRESH = 100;     // Very fresh attestation
    int128 public constant SCORE_RECENT = 98;     // Recent attestation
    int128 public constant SCORE_BASE = 95;       // Normal attestation

    event AttestationValidated(
        uint256 indexed agentId,
        bytes32 indexed taskId,
        address indexed recipient,
        string apiUrl,
        bytes32 dataHash,
        uint64 timestamp,
        bool success
    );

    event ReputationGranted(
        uint256 indexed agentId,
        int128 score,
        uint256 age,
        bytes32 taskId
    );

    event ScoreConfigUpdated(
        int128 baseScore,
        uint8 decimals,
        uint256 freshnessBonus1,
        uint256 freshnessBonus2
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        require(
            msg.sender == identityRegistry.ownerOf(agentId) ||
            msg.sender == identityRegistry.getAgentWallet(agentId),
            "Not agent owner"
        );
        _;
    }

    constructor(
        address _identityRegistry,
        address _reputationRegistry,
        address _primusTaskContract
    ) {
        owner = msg.sender;
        identityRegistry = IERC8004IdentityRegistry(_identityRegistry);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        primusTaskContract = IPrimusTaskContract(_primusTaskContract);
    }

    /**
     * @notice Transfer ownership to new address
     * @param newOwner Address of new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Update base score configuration
     * @param _baseScore New base score (default 95)
     * @param _decimals Number of decimals (0 for integer)
     */
    function setBaseScore(int128 _baseScore, uint8 _decimals) external onlyOwner {
        baseScore = _baseScore;
        scoreDecimals = _decimals;
        emit ScoreConfigUpdated(baseScore, scoreDecimals, freshnessBonus1, freshnessBonus2);
    }

    /**
     * @notice Update freshness bonus thresholds
     * @param _freshnessBonus1 First threshold (e.g., 10 minutes) for max score
     * @param _freshnessBonus2 Second threshold (e.g., 30 minutes) for high score
     */
    function setFreshnessThresholds(
        uint256 _freshnessBonus1,
        uint256 _freshnessBonus2
    ) external onlyOwner {
        require(_freshnessBonus1 < _freshnessBonus2, "Invalid thresholds");
        freshnessBonus1 = _freshnessBonus1;
        freshnessBonus2 = _freshnessBonus2;
        emit ScoreConfigUpdated(baseScore, scoreDecimals, freshnessBonus1, freshnessBonus2);
    }

    /**
     * @notice Calculate score based on attestation freshness
     * @param age Age of attestation in seconds
     * @return score The calculated reputation score
     */
    function calculateScore(uint256 age) public view returns (int128 score) {
        if (age < freshnessBonus1) {
            return SCORE_FRESH;  // 100 - Very fresh
        } else if (age < freshnessBonus2) {
            return SCORE_RECENT; // 98 - Recent
        } else {
            return baseScore;    // 95 - Normal (configurable)
        }
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
        uint256 age = block.timestamp - ts;
        require(age <= MAX_AGE, "Expired");

        // Calculate score based on freshness
        int128 score = calculateScore(age);

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

        // Grant reputation with dynamic score
        reputationRegistry.giveFeedback(
            agentId,
            score,
            scoreDecimals,
            "primus-zktls",
            att.request[0].url,
            att.request[0].url,
            att.data,
            taskId
        );

        emit ReputationGranted(agentId, score, age, taskId);

        return true;
    }
}
