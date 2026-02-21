// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ============================================
// SHARED PRIMUS INTERFACES
// ============================================
// These interfaces are shared between PrimusVeritasAppV5 and MockPrimusTask
// to ensure function selectors match exactly.

enum TokenSymbol {
    ETH
}

struct FeeInfo {
    uint256 primusFee;
    uint256 attestorFee;
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

struct TaskInfo {
    string templateId;
    address submitter;
    address[] attestors;
    TaskResult[] taskResults;
    uint64 submittedAt;
    TokenSymbol tokenSymbol;
    address callback;
    uint8 taskStatus;
}

interface IPrimusTask {
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        TokenSymbol tokenSymbol,
        address callback
    ) external payable returns (bytes32 taskId);

    function queryLatestFeeInfo(TokenSymbol tokenSymbol) external view returns (FeeInfo memory);
    function queryTask(bytes32 taskId) external view returns (TaskInfo memory);
}

interface IPrimusNetworkCallback {
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external;
}
