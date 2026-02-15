// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Primus TaskContract Interface (Minimal)
 * @notice Minimal interface for Primus zkTLS
 * @dev Full interface: https://docs.primuslabs.xyz/primus-network/tech-intro
 * @dev Contract: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8 (Base Sepolia)
 */

enum TokenSymbol {
    ETH
}

struct Attestation {
    address recipient;
    bytes request;
    bytes response;
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

interface IPrimusTaskContract {
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        TokenSymbol tokenSymbol,
        address callback
    ) external payable returns (bytes32 taskId);

    function queryTask(bytes32 taskId) external view returns (TaskInfo memory taskInfo);
}
