// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPrimus.sol";

/**
 * @title MockPrimusTask
 * @notice A mock PrimusTask for testing the V5 callback flow
 * @dev Simulates the Primus attestation process with correct interface
 */
contract MockPrimusTask {
    address public owner;
    uint256 public primusFee = 0.001 ether;  // 0.001 ETH
    uint256 public attestorFee = 0.0001 ether; // 0.0001 ETH per check
    
    struct Task {
        address requester;
        string templateId;
        uint256 attestorCount;
        TokenSymbol tokenSymbol;
        address callback;
        uint8 status; // 0=pending, 1=completed, 2=failed
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
    
    function setFee(uint256 _primusFee, uint256 _attestorFee) external onlyOwner {
        primusFee = _primusFee;
        attestorFee = _attestorFee;
    }
    
    // Legacy queryFee function
    function queryFee() external view returns (uint256, uint256) {
        return (primusFee, attestorFee);
    }
    
    // New queryLatestFeeInfo function matching Primus interface
    function queryLatestFeeInfo(TokenSymbol tokenSymbol) external view returns (FeeInfo memory) {
        return FeeInfo({
            primusFee: primusFee,
            attestorFee: attestorFee
        });
    }
    
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        TokenSymbol tokenSymbol,
        address callback
    ) external payable returns (bytes32 taskId) {
        // Calculate required fee
        uint256 requiredFee = primusFee + (attestorFee * attestorCount);
        require(msg.value >= requiredFee, "Insufficient fee");
        
        // Generate task ID
        taskId = keccak256(abi.encodePacked(
            block.timestamp,
            taskCounter++,
            sender
        ));
        
        // Store task
        tasks[taskId] = Task({
            requester: sender,
            templateId: templateId,
            attestorCount: attestorCount,
            tokenSymbol: tokenSymbol,
            callback: callback,
            status: 0, // pending
            result: TaskResult({
                attestor: address(0),
                taskId: bytes32(0),
                attestation: Attestation({
                    recipient: address(0),
                    request: "",
                    responseResolve: "",
                    data: "",
                    timestamp: 0
                })
            })
        });
        
        emit TaskSubmitted(taskId, sender, templateId);
    }
    
    function queryTask(bytes32 taskId) external view returns (
        address requester,
        string memory templateId,
        uint256 attestorCount,
        TokenSymbol tokenSymbol,
        address callback,
        uint8 taskStatus,
        TaskResult memory taskResult
    ) {
        Task storage task = tasks[taskId];
        return (
            task.requester,
            task.templateId,
            task.attestorCount,
            task.tokenSymbol,
            task.callback,
            task.status,
            task.result
        );
    }
    
    /**
     * @notice Complete a task with attestation result (called by owner for testing)
     * @dev This simulates Primus calling the callback
     */
    function completeTask(
        bytes32 taskId,
        address recipient,
        string calldata requestUrl,
        string calldata attestationData,
        uint64 timestamp
    ) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == 0, "Task not pending or already processed");
        require(task.callback != address(0), "No callback");
        
        // Set up attestation result
        task.result.attestation = Attestation({
            recipient: recipient,
            request: bytes(requestUrl),
            responseResolve: "",
            data: attestationData,
            timestamp: timestamp
        });
        task.status = 1; // completed
        
        // Call the callback
        IPrimusNetworkCallback(task.callback).reportTaskResultCallback(
            taskId,
            task.result,
            true
        );
        
        emit TaskCompleted(taskId, true);
    }
    
    /**
     * @notice Complete a task with real Primus SDK attestation
     * @dev This takes the attestation from Primus SDK and forwards it
     */
    function completeTaskWithAttestation(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == 0, "Task not pending or already processed");
        require(task.callback != address(0), "No callback");
        
        task.result = taskResult;
        task.status = success ? 1 : 2;
        
        // Call the callback
        IPrimusNetworkCallback(task.callback).reportTaskResultCallback(
            taskId,
            taskResult,
            success
        );
        
        emit TaskCompleted(taskId, success);
    }
    
    /**
     * @notice Withdraw fees
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}
