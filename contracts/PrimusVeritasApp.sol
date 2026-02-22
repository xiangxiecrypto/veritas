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
contract PrimusVeritasApp {
    address public owner;
    VeritasValidationRegistry public immutable registry;
    IPrimusTask public immutable primusTask;

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

    // Debug: Track all callback attempts
    struct CallbackAttempt {
        address caller;
        bytes32 taskId;
        address attestor;
        string data;
        uint256 blockTime;
        bool success;
    }
    mapping(uint256 => CallbackAttempt) public callbackAttempts;
    uint256 public callbackAttemptCount;

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
        primusTask = IPrimusTask(_primusTask);
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

        // Calculate fee
        FeeInfo memory feeInfo = primusTask.queryLatestFeeInfo(TokenSymbol.ETH);
        uint256 totalFee = (feeInfo.primusFee + feeInfo.attestorFee) * attestorCount;
        require(msg.value >= totalFee, "Insufficient fee");

        // Submit task to Primus with THIS CONTRACT as callback
        taskId = primusTask.submitTask{value: totalFee}(
            msg.sender,
            rule.url,
            attestorCount,
            TokenSymbol.ETH,
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

    /**
     * @notice Called by Primus Task contract when attestation is complete
     * @dev This is the REAL callback from Primus - matches IPrimusNetworkCallback
     * @param taskId The task identifier (returned from submitTask)
     * @param taskResult The full attestation result from Primus
     * @param success Whether the attestation succeeded
     */
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external onlyTask {
        // Log the callback attempt for debugging
        uint256 attemptId = callbackAttemptCount++;
        callbackAttempts[attemptId] = CallbackAttempt({
            caller: msg.sender,
            taskId: taskId,
            attestor: taskResult.attestor,
            data: taskResult.attestation.data,
            blockTime: block.timestamp,
            success: success
        });

        emit CallbackReceived(taskId, msg.sender, taskResult.attestor);

        // Don't process if failed or already processed
        if (!success) {
            return;
        }

        if (processedTasks[taskId]) {
            return;
        }

        // Mark as processed
        processedTasks[taskId] = true;

        // Get pending validation details
        PendingValidation storage pending = pendingValidations[taskId];
        uint256 ruleId = pending.ruleId;

        // If no pending validation found, use rule 0 as default
        if (pending.requester == address(0)) {
            ruleId = 0;
        }

        VerificationRule storage rule = rules[ruleId];
        if (!rule.active) {
            return; // Silently fail if rule inactive
        }

        // Verify freshness
        if (block.timestamp - taskResult.attestation.timestamp > rule.maxAge) {
            return; // Expired
        }

        // Verify attestation matches the rule parameters (BASIC CHECK)
        // The attestation.request contains the URL that was fetched (as bytes)
        // We hash (URL + dataKey + parsePath) and verify it matches the stored ruleHash
        bytes32 attestationHash = keccak256(abi.encodePacked(
            taskResult.attestation.request,  // URL in bytes
            rule.dataKey,
            rule.parsePath
        ));
        require(attestationHash == rule.ruleHash, "Rule mismatch: URL, dataKey, or parsePath don't match");

        // Determine which checks to run
        uint256[] memory checkIds = pending.checkIds.length > 0
            ? pending.checkIds
            : _getAllCheckIds(ruleId);

        // Run custom checks
        int128 totalScore = 0;
        int128 maxScore = 0;

        for (uint256 i = 0; i < checkIds.length; i++) {
            CustomCheck storage check = checks[ruleId][checkIds[i]];
            if (!check.active) continue;

            maxScore += check.score;

            try ICustomCheck(check.checkContract).validate(
                rule.dataKey,
                taskResult.attestation.data,
                check.params
            ) returns (bool passed, int128 value) {
                if (passed) {
                    totalScore += check.score;
                    emit CheckPassed(ruleId, checkIds[i], check.score, value);
                } else {
                    emit CheckFailed(ruleId, checkIds[i]);
                }
            } catch {
                emit CheckFailed(ruleId, checkIds[i]);
            }
        }

        // Calculate 0-100 score
        uint8 response = maxScore > 0
            ? uint8((uint256(int256(totalScore)) * 100) / uint256(int256(maxScore)))
            : 0;

        // Store result in Registry (ERC-8004 compliant)
        // responseURI points to attestation data, responseHash is its commitment
        try registry.validationResponse(
            taskId,                                           // requestHash
            response,                                         // response (0-100 score)
            rule.url,                                         // responseURI (URL used for attestation)
            keccak256(bytes(taskResult.attestation.data)),   // responseHash (commitment to data)
            rule.description                                  // tag (description of validation)
        ) {
            // Registry call succeeded
        } catch {
            // Registry call failed - still emit completion event
        }

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

    function getCallbackAttempt(uint256 attemptId) external view returns (CallbackAttempt memory) {
        return callbackAttempts[attemptId];
    }

    function getPendingValidation(bytes32 taskId) external view returns (PendingValidation memory) {
        return pendingValidations[taskId];
    }
}
