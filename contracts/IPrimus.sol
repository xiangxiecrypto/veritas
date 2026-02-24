// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ============================================
// PRIMUS NETWORK INTERFACES (Official)
// ============================================

/**
 * @dev Structure for representing a network request
 */
struct AttNetworkRequest {
    string url;
    string header;
    string method;
    string body;
}

/**
 * @dev Structure for resolving responses from a network request
 */
struct AttNetworkResponseResolve {
    string keyName;
    string parseType;
    string parsePath;
}

/**
 * @dev Structure for one URL's response resolve
 */
struct AttNetworkOneUrlResponseResolve {
    AttNetworkResponseResolve[] oneUrlResponseResolve;
}

/**
 * @dev Structure representing an attestation
 */
struct Attestation {
    address recipient;
    AttNetworkRequest[] request;
    AttNetworkOneUrlResponseResolve[] responseResolves;
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

struct FeeInfo {
    uint256 primusFee;
    uint256 attestorFee;
    uint64 settedAt;
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
    uint8 tokenSymbol;
    address callback;
    TaskStatus taskStatus;
}

interface ITask {
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        uint8 tokenSymbol,
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
