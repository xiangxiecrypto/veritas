// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VeritasValidationRegistry.sol";
import "./IPrimus.sol";
import "./ICustomCheck.sol";

/**
 * @title PrimusVeritasApp
 * @notice Main application for Primus zkTLS validation with auto-callback
 * @dev Implements IPrimusNetworkCallback for automatic attestation processing
 */
contract PrimusVeritasApp is IPrimusNetworkCallback {
    address public owner;
    VeritasValidationRegistry public immutable registry;
    ITask public immutable primusTask;

    struct VerificationRule {
        string url;             // URL to fetch data from (e.g., "https://api.coinbase.com/v2/exchange-rates?currency=BTC")
        string dataKey;         // Key name for the data (e.g., "btcPrice")
        string parsePath;       // JSON path to extract value (e.g., "$.data.rates.USD")
        uint8 decimals;         // Decimal places for numeric values
        uint256 maxAge;         // Maximum age of data in seconds
        bool active;            // Is this rule active?
        string description;     // Human-readable description
        bytes32 ruleHash;       // Hash of (url, dataKey, parsePath) for verification
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

    mapping(bytes32 => PendingValidation) public pendingValidations;
    mapping(bytes32 => bool) public processedTasks;

    event RuleAdded(uint256 indexed ruleId, string url);
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

    modifier onlyTask() {
        require(msg.sender == address(primusTask), "Only task contract");
        _;
    }

    constructor(address _registry, address _primusTask) {
        owner = msg.sender;
        registry = VeritasValidationRegistry(_registry);
        primusTask = ITask(_primusTask);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function addRule(
        string calldata url,
        string calldata dataKey,
        string calldata parsePath,
        uint8 decimals,
        uint256 maxAge,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;

        // Compute hash of rule parameters for verification
        bytes32 ruleHash = keccak256(abi.encodePacked(url, dataKey, parsePath));

        rules[ruleId] = VerificationRule({
            url: url,
            dataKey: dataKey,
            parsePath: parsePath,
            decimals: decimals,
            maxAge: maxAge,
            active: true,
            description: description,
            ruleHash: ruleHash
        });
        emit RuleAdded(ruleId, url);
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

    function requestValidation(
        uint256 agentId,
        uint256 ruleId,
        uint256[] calldata checkIds,
        uint256 attestorCount
    ) external payable returns (bytes32 taskId) {
        VerificationRule storage rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        
        // Verify caller owns the agent
        require(_isAgentOwner(agentId, msg.sender), "Not agent owner");

        // Calculate fee
        FeeInfo memory feeInfo = primusTask.queryLatestFeeInfo(0); // 0 = ETH
        uint256 totalFee = (feeInfo.primusFee + feeInfo.attestorFee) * attestorCount;
        require(msg.value >= totalFee, "Insufficient fee");

        // Submit task to Primus with THIS CONTRACT as callback
        taskId = primusTask.submitTask{value: totalFee}(
            msg.sender,
            "", // templateId (empty string - actual URL is passed elsewhere)
            attestorCount,
            0, // 0 = ETH
            address(this)
        );

        // Register validation request with ERC-8004 ValidationRegistry
        // This contract acts as the validator
        registry.validationRequest(
            address(this),      // validatorAddress (this contract validates)
            agentId,            // agentId being validated
            rule.url,           // requestURI (URL for attestation data)
            taskId              // requestHash (unique identifier)
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

    event DebugStart(bytes32 taskId, uint256 ruleId, address requester);
    event DebugRule(uint256 ruleId, bool active, uint256 maxAge);
    event DebugTimestamp(uint256 blockTime, uint256 attestationTime, uint256 maxAge, bool expired);
    event DebugCheckLoop(uint256 checkCount);
    event DebugStaticcall(bool success, uint256 returnDataLength, bytes returnData);
    event DebugInputLength(uint256 length);
    event DebugCheckCall(uint256 checkId, address checkContract, bool active);
    event DebugCheckInput(bytes url, bytes responseResolve, string data, string ruleUrl, string ruleDataKey);
    event DebugCheckResult(uint256 checkId, bool passed);
    event DebugScore(int128 totalScore, int128 maxScore, uint8 response);
    event DebugRegistryCall(bytes32 taskId, uint8 response);
    event DebugComplete(bytes32 taskId, uint8 response);
    
    /**
     * @notice Manual submission of attestation result
     * @dev Fetches attestation data from Primus TaskContract (cannot be faked)
     * @param taskId The task identifier from requestValidation()
     */
    function submitAttestation(bytes32 taskId) external {
        PendingValidation storage pending = pendingValidations[taskId];
        
        // Only requester or owner can submit
        require(
            msg.sender == pending.requester || msg.sender == owner,
            "Not authorized"
        );
        
        require(!processedTasks[taskId], "Already processed");
        
        // Fetch attestation from Primus TaskContract (trusted source)
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        
        // Verify attestation exists
        require(taskInfo.taskResults.length > 0, "No attestation found");
        require(taskInfo.taskStatus == TaskStatus.SUCCESS, "Task not successful");
        
        // Get the attestation data
        TaskResult memory result = taskInfo.taskResults[0];
        
        // Mark as processed
        processedTasks[taskId] = true;
        
        // Process the validation with full attestation data
        // Primus TaskContract already returns timestamp in seconds
        _processValidation(
            taskId,
            result.attestation.request,
            result.attestation.responseResolve,
            result.attestation.data,
            result.attestation.timestamp
        );
    }

    /**
     * @notice Called by Primus Task contract when attestation is complete
     * @dev This is the AUTO callback from Primus - matches IPrimusNetworkCallback
     * @param taskId The task identifier (returned from submitTask)
     * @param taskResult The full attestation result from Primus
     * @param success Whether the attestation succeeded
     */
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external onlyTask {
        // Don't process if failed or already processed
        if (!success || processedTasks[taskId]) {
            return;
        }

        // Mark as processed
        processedTasks[taskId] = true;

        // Process the validation with full attestation data
        // Primus returns timestamp in seconds (not milliseconds)
        _processValidation(
            taskId,
            taskResult.attestation.request,
            taskResult.attestation.responseResolve,
            taskResult.attestation.data,
            taskResult.attestation.timestamp
        );
    }

    /**
     * @dev Internal function to process validation - shared by both methods
     */
    function _processValidation(
        bytes32 taskId,
        bytes memory request,
        bytes memory responseResolve,
        string memory attestationData,
        uint64 timestamp
    ) internal {
        // Get pending validation details
        PendingValidation storage pending = pendingValidations[taskId];
        uint256 ruleId = pending.ruleId;

        emit DebugStart(taskId, ruleId, pending.requester);

        // If no pending validation found, use rule 0 as default
        if (pending.requester == address(0)) {
            ruleId = 0;
        }

        VerificationRule storage rule = rules[ruleId];
        
        emit DebugRule(ruleId, rule.active, rule.maxAge);
        
        if (!rule.active) {
            return; // Silently fail if rule inactive
        }

        // Verify freshness
        // SDK returns timestamp in milliseconds, convert to seconds
        uint64 attestationTimeSeconds = timestamp > 1000000000000 ? timestamp / 1000 : timestamp;
        bool expired = block.timestamp - attestationTimeSeconds > rule.maxAge;
        emit DebugTimestamp(block.timestamp, attestationTimeSeconds, rule.maxAge, expired);
        
        if (expired) {
            return; // Expired
        }

        // Determine which checks to run
        uint256[] memory checkIds = pending.checkIds.length > 0
            ? pending.checkIds
            : _getAllCheckIds(ruleId);

        emit DebugCheckLoop(checkIds.length);

        // Run custom checks - SIMPLIFIED: always pass
        int128 totalScore = 0;
        int128 maxScore = 0;

        for (uint256 i = 0; i < checkIds.length; i++) {
            CustomCheck storage check = checks[ruleId][checkIds[i]];
            
            emit DebugCheckCall(checkIds[i], check.checkContract, check.active);
            
            if (!check.active) continue;

            maxScore += check.score;
            
            // Call check with explicit gas
            bool passed = ICustomCheck(check.checkContract).validate{gas: 100000}(
                request,
                responseResolve,
                attestationData,
                rule.url,
                rule.dataKey,
                rule.parsePath,
                check.params
            );
            
            if (passed) {
                totalScore += check.score;
                emit CheckPassed(ruleId, checkIds[i], check.score, 0);
            } else {
                emit CheckFailed(ruleId, checkIds[i]);
            }
        }

        // Calculate 0-100 score
        uint8 response = maxScore > 0
            ? uint8((uint256(int256(totalScore)) * 100) / uint256(int256(maxScore)))
            : 0;

        emit DebugScore(totalScore, maxScore, response);

        // Store result in Registry (ERC-8004 compliant)
        emit DebugRegistryCall(taskId, response);
        
        try registry.validationResponse(
            taskId,
            response,
            rule.url,
            keccak256(bytes(attestationData)),
            rule.description
        ) {
            // Registry call succeeded
        } catch {
            // Registry call failed - still emit completion event
        }

        emit DebugComplete(taskId, response);
        emit ValidationCompleted(taskId, response);
    }

    function _getAllCheckIds(uint256 ruleId) internal view returns (uint256[] memory) {
        uint256 count = checkCount[ruleId];
        uint256[] memory ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = i;
        }
        return ids;
    }

    function getPendingValidation(bytes32 taskId) external view returns (PendingValidation memory) {
        return pendingValidations[taskId];
    }
    
    function _isAgentOwner(uint256 agentId, address owner) internal returns (bool) {
        // Query identity registry to verify ownership
        // Uses ERC-721 ownerOf standard
        address identityRegistry = registry.getIdentityRegistry();
        if (identityRegistry == address(0)) return false;
        
        (bool success, bytes memory result) = identityRegistry.call(
            abi.encodeWithSignature("ownerOf(uint256)", agentId)
        );
        
        if (success && result.length >= 32) {
            address agentOwner = abi.decode(result, (address));
            return agentOwner == owner;
        }
        return false;
    }
}
