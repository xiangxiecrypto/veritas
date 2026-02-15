// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Primus TaskContract Interface - OFFICIAL
 * @notice Official Primus zkTLS interface
 * @dev Use this interface to interact with Primus TaskContract
 */

enum TokenSymbol {
    ETH
}

enum TaskStatus {
    INIT,
    SUCCESS,
    PARTIAL_SUCCESS,
    PARTIAL_SUCCESS_SETTLED,
    FAILED
}

struct Attestation {
    address recipient;
    bytes request;      // ABI-encoded request data
    bytes response;     // ABI-encoded response data
    string data;       // JSON string with attestation data
    uint64 timestamp;
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
    TokenSymbol tokenSymbol;
    address callback;
    TaskStatus taskStatus;
}

interface IPrimusTaskContract {
    /**
     * @notice Submit a new task to Primus
     * @param sender The address that submitted the task
     * @param templateId Template identifier for the task
     * @param attestorCount Number of attestors required
     * @param tokenSymbol Token for fee payment (ETH)
     * @param callback Callback address (address(0) if none)
     * @return taskId The unique ID of the created task
     */
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        TokenSymbol tokenSymbol,
        address callback
    ) external payable returns (bytes32 taskId);

    /**
     * @notice Query task information
     * @param taskId The task ID to query
     * @return taskInfo Complete task information
     */
    function queryTask(bytes32 taskId) external view returns (TaskInfo memory taskInfo);

    /**
     * @notice Query unsettled tasks for a user
     */
    function queryUnsettledTasks(
        address user,
        TokenSymbol tokenSymbol,
        uint256 offset,
        uint256 limit
    ) external view returns (TaskInfo[] memory taskInfos, uint256 totalCount);

    /**
     * @notice Query task results by recipient
     */
    function queryRecipientTaskResults(
        address recipient,
        string calldata templateId,
        uint256 offset,
        uint256 limit
    ) external view returns (TaskResult[] memory taskResults, uint256 totalCount);

    /**
     * @notice Verify a task result (view function)
     */
    function verifyTaskResult(TaskResult calldata taskResult) external view;

    /**
     * @notice Report task result (attestor calls this)
     */
    function reportResult(
        bytes32 taskId,
        Attestation calldata attestation,
        bytes calldata signature
    ) external;

    /**
     * @notice Query user's balance
     */
    function queryBalance(
        address user,
        TokenSymbol tokenSymbol
    ) external view returns (uint256 toWithdraw, uint256 toLock);

    /**
     * @notice Query latest fee information
     */
    function queryLatestFeeInfo(TokenSymbol tokenSymbol)
        external
        view
        returns (uint256 primusFee, uint256 attestorFee);

    /**
     * @notice Withdraw available balance
     */
    function withdrawBalance(TokenSymbol tokenSymbol, uint256 limit) external;
}
