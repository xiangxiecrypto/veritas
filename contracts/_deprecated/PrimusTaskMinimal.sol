// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Simple Primus structures
struct PrimusRequest {
    string url;
    string header;
    string method;
    string body;
}

struct PrimusAttestation {
    address recipient;
    PrimusRequest[] request;
    string data;
    uint64 timestamp;
}

struct PrimusTaskResult {
    address attestor;
    bytes32 taskId;
    PrimusAttestation attestation;
}

struct PrimusTaskInfo {
    string templateId;
    address submitter;
    address[] attestors;
    PrimusTaskResult[] taskResults;
    uint64 submittedAt;
    uint8 tokenSymbol;
    address callback;
    uint8 taskStatus;
}

interface IPrimusTask {
    function submitTask(
        string calldata templateId,
        address[] calldata attestors,
        PrimusRequest[] calldata requests,
        string calldata attConditions,
        string calldata additionParams
    ) external payable returns (bytes32 taskId);
    
    function queryTask(bytes32 taskId) external view returns (PrimusTaskInfo memory taskInfo);
}

contract MinimalPrimusTest {
    IPrimusTask public primusTask;
    
    constructor(address _primusTask) {
        primusTask = IPrimusTask(_primusTask);
    }
    
    function submitTask(
        string calldata url
    ) external payable returns (bytes32) {
        PrimusRequest[] memory requests = new PrimusRequest[](1);
        requests[0] = PrimusRequest({
            url: url,
            header: "",
            method: "GET",
            body: ""
        });
        
        address[] memory attestors = new address[](1);
        attestors[0] = address(0);
        
        return primusTask.submitTask{value: msg.value}(
            "",
            attestors,
            requests,
            "",
            ""
        );
    }
    
    function getTask(bytes32 taskId) external view returns (PrimusTaskInfo memory) {
        return primusTask.queryTask(taskId);
    }
}
