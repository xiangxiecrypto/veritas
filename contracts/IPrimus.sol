// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ============================================
// PRIMUS NETWORK INTERFACES
// ============================================
// Matches the deployed Primus TaskContract on Base Sepolia

struct FeeInfo {
    uint256 primusFee;
    uint256 attestorFee;
    uint64 settedAt;
}

struct Attestation {
    address recipient;
    bytes request;
    bytes responseResolve;
    string data;
    uint64 timestamp;
}

struct TaskResult {
    address attestor;
    bytes32 taskId;
    Attestation attestation;
}

enum TaskStatus {
    INIT,
    SUCCESS,
    PARTIAL_SUCCESS,
    PARTIAL_SUCCESS_SETTLED,
    FAILED
}

struct TaskInfo {
    string templateId;
    address submitter;
    address[] attestors;
    TaskResult[] taskResults;
    uint64 submittedAt;
    uint8 tokenSymbol;  // uint8 (0 = ETH)
    address callback;
    TaskStatus taskStatus;
}

interface ITask {
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        uint8 tokenSymbol,  // uint8 (0 = ETH) - matches deployed contract
        address callback
    ) external payable returns (bytes32 taskId);

    function queryTask(bytes32 taskId) external view returns (TaskInfo memory taskInfo);
    function queryLatestFeeInfo(uint8 tokenSymbol) external view returns (FeeInfo memory feeInfo);
}

interface IPrimusNetworkCallback {
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external;
}
