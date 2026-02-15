// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Primus TaskContract Interface
 * @notice Official Primus interface
 * @dev From Primus official contracts
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
    bytes request;  // ABI-encoded request data
    bytes response; // ABI-encoded response data
    string data;
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
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        TokenSymbol tokenSymbol,
        address callback
    ) external payable returns (bytes32 taskId);

    function queryTask(bytes32 taskId) external view returns (TaskInfo memory taskInfo);

    function reportResult(
        bytes32 taskId,
        Attestation calldata attestation,
        bytes calldata signature
    ) external;

    function verifyTaskResult(TaskResult calldata taskResult) external view;
}
