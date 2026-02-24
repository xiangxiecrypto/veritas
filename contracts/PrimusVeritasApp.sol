// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VeritasValidationRegistry.sol";
import "./IPrimus.sol";
import "./ICustomCheck.sol";

/**
 * @title IReputationRegistry
 * @notice ERC-8004 Reputation Registry interface (deployed version)
 * @dev The deployed contract uses uint8 for value (not int128 as in standard)
 */
interface IReputationRegistry {
    function giveFeedback(
        uint256 agentId,
        uint8 value,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;
    
    function getReputation(uint256 agentId) external view returns (uint256);
}

/**
 * @title PrimusVeritasApp
 * @notice Main application for Primus zkTLS validation with auto-callback
 * @dev Implements IPrimusNetworkCallback for automatic attestation processing
 */
contract PrimusVeritasApp is IPrimusNetworkCallback {
    address public owner;
    VeritasValidationRegistry public immutable registry;
    ITask public immutable primusTask;
    IReputationRegistry public immutable reputationRegistry;

    struct VerificationRule {
        string url;
        string dataKey;
        string parsePath;
        uint8 decimals;
        uint256 maxAge;
        bool active;
        string description;
        bytes32 ruleHash;
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
    event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score);
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

    constructor(address _registry, address _primusTask, address _reputationRegistry) {
        owner = msg.sender;
        registry = VeritasValidationRegistry(_registry);
        primusTask = ITask(_primusTask);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
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
        
        require(_isAgentOwner(agentId, msg.sender), "Not agent owner");

        FeeInfo memory feeInfo = primusTask.queryLatestFeeInfo(0);
        uint256 totalFee = (feeInfo.primusFee + feeInfo.attestorFee) * attestorCount;
        require(msg.value >= totalFee, "Insufficient fee");

        taskId = primusTask.submitTask{value: totalFee}(
            msg.sender,
            "",
            attestorCount,
            0,
            address(this)
        );

        registry.validationRequest(
            address(this),
            agentId,
            rule.url,
            taskId
        );

        PendingValidation storage pending = pendingValidations[taskId];
        pending.ruleId = ruleId;
        pending.agentId = agentId;
        pending.requester = msg.sender;
        for (uint256 i = 0; i < checkIds.length; i++) {
            pending.checkIds.push(checkIds[i]);
        }

        emit ValidationRequested(taskId, ruleId, agentId);

        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }

        return taskId;
    }

    function submitAttestation(bytes32 taskId) external {
        PendingValidation storage pending = pendingValidations[taskId];
        
        require(
            msg.sender == pending.requester || msg.sender == owner,
            "Not authorized"
        );
        
        require(!processedTasks[taskId], "Already processed");
        
        TaskInfo memory taskInfo = primusTask.queryTask(taskId);
        
        require(taskInfo.taskResults.length > 0, "No attestation found");
        require(taskInfo.taskStatus == TaskStatus.SUCCESS, "Task not successful");
        
        TaskResult memory result = taskInfo.taskResults[0];
        
        processedTasks[taskId] = true;
        
        _processValidation(
            taskId,
            abi.encode(result.attestation.request),
            abi.encode(result.attestation.responseResolves),
            result.attestation.data,
            result.attestation.timestamp
        );
    }

    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external onlyTask {
        if (!success || processedTasks[taskId]) {
            return;
        }

        processedTasks[taskId] = true;

        _processValidation(
            taskId,
            abi.encode(taskResult.attestation.request),
            abi.encode(taskResult.attestation.responseResolves),
            taskResult.attestation.data,
            taskResult.attestation.timestamp
        );
    }

    function _processValidation(
        bytes32 taskId,
        bytes memory request,
        bytes memory responseResolve,
        string memory attestationData,
        uint64 timestamp
    ) internal {
        PendingValidation storage pending = pendingValidations[taskId];
        uint256 ruleId = pending.ruleId;

        if (pending.requester == address(0)) {
            ruleId = 0;
        }

        VerificationRule storage rule = rules[ruleId];
        
        if (!rule.active) {
            return;
        }

        uint64 attestationTimeSeconds = timestamp > 1000000000000 ? timestamp / 1000 : timestamp;
        
        if (block.timestamp - attestationTimeSeconds > rule.maxAge) {
            return;
        }

        uint256[] memory checkIds = pending.checkIds.length > 0
            ? pending.checkIds
            : _getAllCheckIds(ruleId);

        int128 totalScore = 0;
        int128 maxScore = 0;

        for (uint256 i = 0; i < checkIds.length; i++) {
            CustomCheck storage check = checks[ruleId][checkIds[i]];
            
            if (!check.active) continue;

            maxScore += check.score;
            
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
                emit CheckPassed(ruleId, checkIds[i], check.score);
            } else {
                emit CheckFailed(ruleId, checkIds[i]);
            }
        }

        uint8 response = maxScore > 0
            ? uint8((uint256(int256(totalScore)) * 100) / uint256(int256(maxScore)))
            : 0;

        try registry.validationResponse(
            taskId,
            response,
            rule.url,
            keccak256(bytes(attestationData)),
            rule.description
        ) {
        } catch {
        }

        try reputationRegistry.giveFeedback(
            pending.agentId,
            uint8(uint256(int256(totalScore))),
            "",
            "",
            "",
            "",
            bytes32(0)
        ) {
        } catch {
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

    function getPendingValidation(bytes32 taskId) external view returns (PendingValidation memory) {
        return pendingValidations[taskId];
    }
    
    function _isAgentOwner(uint256 agentId, address owner) internal returns (bool) {
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
