// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPrimus.sol";

/**
 * @title MockPrimusTask
 * @notice A mock PrimusTask for testing the callback flow
 * @dev Simulates the Primus attestation process with official interface
 */
contract MockPrimusTask {
    address public owner;
    uint256 public primusFee = 10000000000; // 10^10 wei
    uint256 public attestorFee = 0;
    
    struct Task {
        address requester;
        string templateId;
        uint256 attestorCount;
        uint8 tokenSymbol;  // 0 = ETH
        address callback;
        TaskStatus status;
        TaskResult result;
    }
    
    mapping(bytes32 => Task) public tasks;
    uint256 public taskCounter;
    
    event TaskSubmitted(bytes32 indexed taskId, address requester, string templateId);
    event TaskCompleted(bytes32 indexed taskId, bool success);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function queryLatestFeeInfo(uint8) external pure returns (FeeInfo memory) {
        return FeeInfo({
            primusFee: 10000000000,
            attestorFee: 0,
            settedAt: 0
        });
    }
    
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        uint8 tokenSymbol,
        address callback
    ) external payable returns (bytes32 taskId) {
        require(msg.value >= primusFee, "Insufficient fee");
        
        taskId = keccak256(abi.encodePacked(
            block.timestamp,
            taskCounter++,
            sender
        ));
        
        tasks[taskId] = Task({
            requester: sender,
            templateId: templateId,
            attestorCount: attestorCount,
            tokenSymbol: tokenSymbol,
            callback: callback,
            status: TaskStatus.INIT,
            result: TaskResult({
                attestor: address(0),
                taskId: bytes32(0),
                attestation: Attestation({
                    recipient: address(0),
                    request: "",
                    responseResolve: "",
                    data: "",
                    sig: bytes32(0),
                    timestamp: 0
                })
            })
        });
        
        emit TaskSubmitted(taskId, sender, templateId);
    }
    
    function queryTask(bytes32 taskId) external view returns (TaskInfo memory taskInfo) {
        Task storage task = tasks[taskId];
        
        TaskResult[] memory results = new TaskResult[](1);
        results[0] = task.result;
        
        return TaskInfo({
            templateId: task.templateId,
            submitter: task.requester,
            attestors: new address[](0),
            taskResults: results,
            submittedAt: 0,
            tokenSymbol: task.tokenSymbol,
            callback: task.callback,
            taskStatus: task.status
        });
    }
    
    function completeTask(
        bytes32 taskId,
        address recipient,
        string calldata requestUrl,
        string calldata attestationData,
        uint64 timestamp
    ) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.INIT, "Task not pending");
        require(task.callback != address(0), "No callback");
        
        task.result = TaskResult({
            attestor: msg.sender,
            taskId: taskId,
            attestation: Attestation({
                recipient: recipient,
                request: bytes(requestUrl),
                responseResolve: "",
                data: attestationData,
                sig: bytes32(0),
                timestamp: timestamp
            })
        });
        task.status = TaskStatus.SUCCESS;
        
        IPrimusNetworkCallback(task.callback).reportTaskResultCallback(
            taskId,
            task.result,
            true
        );
        
        emit TaskCompleted(taskId, true);
    }
    
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}
