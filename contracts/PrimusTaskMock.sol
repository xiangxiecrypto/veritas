// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PrimusTaskMock
 * @notice Mock PrimusTask that calls callback on recipient
 * @dev This simulates Primus network behavior for testing
 */
contract PrimusTaskMock {
    address public owner;
    
    struct Task {
        address recipient;
        bytes32 taskId;
        bytes request;
        bytes responseResolve;
        string data;
        uint64 timestamp;
        bool completed;
    }
    
    mapping(bytes32 => Task) public tasks;
    
    event TaskSubmitted(bytes32 indexed taskId, address recipient);
    event TaskCompleted(bytes32 indexed taskId, string data);
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Submit a task (simulates Primus SDK submission)
     */
    function submitTask(address recipient) external returns (bytes32 taskId) {
        taskId = keccak256(abi.encodePacked(block.timestamp, msg.sender, recipient));
        
        tasks[taskId] = Task({
            recipient: recipient,
            taskId: taskId,
            request: "",
            responseResolve: "",
            data: "",
            timestamp: 0,
            completed: false
        });
        
        emit TaskSubmitted(taskId, recipient);
    }
    
    /**
     * @notice Complete task with attestation data (simulates Primus attestation)
     * @dev Calls the callback on recipient
     */
    function completeTask(
        bytes32 taskId,
        string calldata attestationData,
        uint64 timestamp
    ) external {
        Task storage task = tasks[taskId];
        require(task.recipient != address(0), "Task not found");
        require(!task.completed, "Already completed");
        
        task.data = attestationData;
        task.timestamp = timestamp;
        task.completed = true;
        
        emit TaskCompleted(taskId, attestationData);
        
        // Call callback on recipient
        // The recipient should implement reportTaskResultCallback
        (bool success, ) = task.recipient.call(
            abi.encodeWithSignature(
                "reportTaskResultCallback(bytes32,(address,bytes,bytes,string,uint64),bool)",
                taskId,
                task.recipient,
                task.request,
                task.responseResolve,
                attestationData,
                timestamp,
                true
            )
        );
        
        // Don't revert if callback fails - just emit event
        if (!success) {
            // Callback failed, but task is still stored
        }
    }
    
    function getTask(bytes32 taskId) external view returns (
        address recipient,
        string memory data,
        uint64 timestamp,
        bool completed
    ) {
        Task storage task = tasks[taskId];
        return (task.recipient, task.data, task.timestamp, task.completed);
    }
}
