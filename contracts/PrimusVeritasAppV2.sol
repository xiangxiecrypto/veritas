// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VeritasValidationRegistry.sol";
import "./IPrimus.sol";
import "./ICustomCheck.sol";

/**
 * @title PrimusVeritasAppV2
 * @notice Content-addressable validation rules using JSON hashes
 * @dev Rule ID = keccak256(jsonContent), Check ID = checkContract address
 */
contract PrimusVeritasAppV2 is IPrimusNetworkCallback {
    address public owner;
    VeritasValidationRegistry public immutable registry;
    ITask public immutable primusTask;

    // Rule = JSON content stored directly
    struct VerificationRule {
        string json;           // Full JSON content
        bool active;
        uint256 createdAt;
    }

    // Check indexed by address (no uint256 ID)
    struct CustomCheck {
        address checkContract;  // This IS the check ID
        bytes params;
        int128 score;
        bool active;
    }

    struct PendingValidation {
        bytes32 ruleId;        // bytes32 = hash of JSON
        address[] checkAddresses;  // Check IDs = addresses
        uint256 agentId;
        address requester;
    }

    // Mapping: ruleId (hash) => Rule
    mapping(bytes32 => VerificationRule) public rules;
    
    // Mapping: ruleId => checkAddresses[]
    mapping(bytes32 => address[]) public ruleCheckAddresses;
    
    // Mapping: ruleId => checkAddress => Check
    mapping(bytes32 => mapping(address => CustomCheck)) public ruleChecks;

    // Pending validations
    mapping(bytes32 => PendingValidation) public pendingValidations;
    mapping(bytes32 => bool) public processedTasks;

    // Events
    event RuleAdded(bytes32 indexed ruleId, string json);
    event CheckAdded(bytes32 indexed ruleId, address indexed checkContract, int128 score);
    event ValidationRequested(
        bytes32 indexed taskId,
        uint256 indexed agentId,
        bytes32 indexed ruleId,
        address[] checkAddresses
    );
    event ValidationCompleted(
        bytes32 indexed taskId,
        uint256 indexed agentId,
        bytes32 indexed ruleId,
        uint256 totalScore,
        uint256 maxScore,
        uint256 normalizedScore
    );
    event CheckPassed(bytes32 indexed ruleId, address indexed checkContract, int128 score);
    event CheckFailed(bytes32 indexed ruleId, address indexed checkContract);

    constructor(address _registry, address _primusTask) {
        owner = msg.sender;
        registry = VeritasValidationRegistry(_registry);
        primusTask = ITask(_primusTask);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @notice Add a new rule from JSON content
     * @param json The full JSON content (rule ID = keccak256(json))
     * @return ruleId The hash of the JSON content
     */
    function addRule(string calldata json) external returns (bytes32 ruleId) {
        // Calculate hash from JSON
        ruleId = keccak256(bytes(json));
        
        // Check if exists
        require(rules[ruleId].createdAt == 0, "Rule already exists");
        
        // Store rule
        rules[ruleId] = VerificationRule({
            json: json,
            active: true,
            createdAt: block.timestamp
        });
        
        emit RuleAdded(ruleId, json);
    }

    /**
     * @notice Get rule JSON by ID
     */
    function getRule(bytes32 ruleId) external view returns (string memory json, bool active, uint256 createdAt) {
        VerificationRule storage rule = rules[ruleId];
        return (rule.json, rule.active, rule.createdAt);
    }

    /**
     * @notice Add a check to a rule
     * @param ruleId The rule ID (hash of JSON)
     * @param checkContract The check contract address (this IS the check ID)
     * @param params Custom parameters for the check
     * @param score Score awarded if check passes
     */
    function addCheck(
        bytes32 ruleId,
        address checkContract,
        bytes calldata params,
        int128 score
    ) external onlyOwner {
        require(rules[ruleId].createdAt > 0, "Rule not found");
        require(checkContract != address(0), "Invalid check address");
        
        // Check if already added
        CustomCheck storage existing = ruleChecks[ruleId][checkContract];
        require(existing.checkContract == address(0), "Check already exists");
        
        // Add check
        ruleChecks[ruleId][checkContract] = CustomCheck({
            checkContract: checkContract,
            params: params,
            score: score,
            active: true
        });
        
        // Track address in array
        ruleCheckAddresses[ruleId].push(checkContract);
        
        emit CheckAdded(ruleId, checkContract, score);
    }

    /**
     * @notice Get check count for a rule
     */
    function getCheckCount(bytes32 ruleId) external view returns (uint256) {
        return ruleCheckAddresses[ruleId].length;
    }

    /**
     * @notice Get check addresses for a rule
     */
    function getCheckAddresses(bytes32 ruleId) external view returns (address[] memory) {
        return ruleCheckAddresses[ruleId];
    }

    /**
     * @notice Request validation with Primus
     * @param agentId The agent ID to validate
     * @param ruleId The rule ID (hash of JSON)
     * @param checkAddresses The check contract addresses to run
     * @param attestorCount Number of attestors required
     */
    function requestValidation(
        uint256 agentId,
        bytes32 ruleId,
        address[] calldata checkAddresses,
        uint256 attestorCount
    ) external payable returns (bytes32 taskId) {
        require(rules[ruleId].active, "Rule not active");
        require(checkAddresses.length > 0, "No checks specified");
        
        // Submit to Primus TaskContract
        // Note: Parse URL from JSON off-chain for the actual API call
        taskId = primusTask.submitTask{value: msg.value}(
            msg.sender,
            "",  // templateId - will be set from JSON URL off-chain
            attestorCount,
            0,   // tokenSymbol
            address(this)
        );
        
        // Register validation request in registry
        registry.validationRequest(
            address(this),  // validatorAddress = this app
            agentId,
            "",  // requestURI
            taskId  // requestHash
        );
        
        // Store pending validation
        pendingValidations[taskId] = PendingValidation({
            ruleId: ruleId,
            checkAddresses: checkAddresses,
            agentId: agentId,
            requester: msg.sender
        });
        
        emit ValidationRequested(taskId, agentId, ruleId, checkAddresses);
    }

    /**
     * @notice Called by Primus Task contract when attestation is complete
     */
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata result,
        bool success
    ) external override {
        require(msg.sender == address(primusTask), "Only Primus");
        require(!processedTasks[taskId], "Already processed");
        require(success, "Task failed");
        
        processedTasks[taskId] = true;
        
        // Process validation with attestation data
        _processValidation(
            taskId,
            abi.encode(result.attestation.request),
            abi.encode(result.attestation.responseResolves),
            result.attestation.data,
            result.attestation.timestamp
        );
    }

    /**
     * @notice Internal validation processing
     */
    function _processValidation(
        bytes32 taskId,
        bytes memory request,
        bytes memory responseResolves,
        string memory attestationData,
        uint64 timestamp
    ) internal {
        PendingValidation storage pending = pendingValidations[taskId];
        bytes32 ruleId = pending.ruleId;
        
        require(rules[ruleId].active, "Rule not active");
        require(pending.requester != address(0), "No pending validation");
        
        // Parse JSON off-chain fields (for this version, we'll need to adjust)
        // For now, extract from JSON - this needs to be implemented
        // In production, we'd parse the JSON, but for simplicity:
        
        // Decode request to get URL
        AttNetworkRequest[] memory requests = abi.decode(request, (AttNetworkRequest[]));
        string memory attestationUrl = requests.length > 0 ? requests[0].url : "";
        
        // Decode responseResolves to get dataKey and parsePath
        AttNetworkOneUrlResponseResolve[] memory resolves = abi.decode(responseResolves, (AttNetworkOneUrlResponseResolve[]));
        string memory dataKey = "";
        string memory parsePath = "";
        if (resolves.length > 0 && resolves[0].oneUrlResponseResolve.length > 0) {
            dataKey = resolves[0].oneUrlResponseResolve[0].keyName;
            parsePath = resolves[0].oneUrlResponseResolve[0].parsePath;
        }
        
        // Run checks
        int256 totalScore = 0;
        int256 maxScore = 0;
        
        for (uint256 i = 0; i < pending.checkAddresses.length; i++) {
            address checkAddr = pending.checkAddresses[i];
            CustomCheck storage check = ruleChecks[ruleId][checkAddr];
            
            if (!check.active) continue;
            
            maxScore += check.score;
            
            // Call check contract
            bool passed = ICustomCheck(check.checkContract).validate{gas: 100000}(
                request,
                responseResolves,
                attestationData,
                attestationUrl,
                dataKey,
                parsePath,
                check.params
            );
            
            if (passed) {
                totalScore += check.score;
                emit CheckPassed(ruleId, checkAddr, check.score);
            } else {
                emit CheckFailed(ruleId, checkAddr);
            }
        }
        
        // Calculate normalized score
        uint256 normalizedScore = maxScore > 0 ? uint256((totalScore * 100) / maxScore) : 0;
        
        // Record to registry
        registry.validationResponse(
            taskId,  // requestHash
            uint8(normalizedScore > 0 ? 1 : 0),  // response
            "",  // responseURI
            keccak256(bytes(attestationData)),  // responseHash
            ""  // tag
        );
        
        emit ValidationCompleted(taskId, pending.agentId, ruleId, uint256(totalScore), uint256(maxScore), normalizedScore);
    }
}
