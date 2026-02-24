// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ReputationRegistry
 * @notice ERC-8004 compliant reputation registry for agents
 * @dev Stores feedback/reputation scores for agents
 */
contract ReputationRegistry {
    address public owner;
    
    // Agent => Total Reputation
    mapping(uint256 => uint256) public reputation;
    
    // Agent => Feedback count
    mapping(uint256 => uint256) public feedbackCount;
    
    // Agent => Total feedback sum (for average calculation)
    mapping(uint256 => uint256) public feedbackSum;
    
    // Agent => Validator => Feedback value (latest)
    mapping(uint256 => mapping(address => uint8)) public validatorFeedback;
    
    // Events
    event FeedbackGiven(
        uint256 indexed agentId,
        address indexed validator,
        uint8 value,
        uint256 newReputation
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Give feedback to an agent
     * @param agentId The agent ID
     * @param value The feedback value (0-100)
     */
    function giveFeedback(uint256 agentId, uint8 value) external {
        require(value <= 100, "Value must be 0-100");
        
        // If this validator already gave feedback, update the sum
        uint8 oldValue = validatorFeedback[agentId][msg.sender];
        if (oldValue > 0) {
            feedbackSum[agentId] -= oldValue;
        } else {
            feedbackCount[agentId]++;
        }
        
        // Store new feedback
        validatorFeedback[agentId][msg.sender] = value;
        feedbackSum[agentId] += value;
        
        // Calculate new reputation (average)
        if (feedbackCount[agentId] > 0) {
            reputation[agentId] = feedbackSum[agentId] / feedbackCount[agentId];
        }
        
        emit FeedbackGiven(agentId, msg.sender, value, reputation[agentId]);
    }
    
    /**
     * @notice Get agent reputation
     * @param agentId The agent ID
     * @return The reputation score (0-100)
     */
    function getReputation(uint256 agentId) external view returns (uint256) {
        return reputation[agentId];
    }
    
    /**
     * @notice Get average feedback for an agent
     * @param agentId The agent ID
     * @return The average feedback score
     */
    function getAverageFeedback(uint256 agentId) external view returns (uint256) {
        if (feedbackCount[agentId] == 0) return 0;
        return feedbackSum[agentId] / feedbackCount[agentId];
    }
    
    /**
     * @notice Get feedback count for an agent
     * @param agentId The agent ID
     * @return The number of feedback entries
     */
    function getFeedbackCount(uint256 agentId) external view returns (uint256) {
        return feedbackCount[agentId];
    }
    
    /**
     * @notice Get validator's feedback for an agent
     * @param agentId The agent ID
     * @param validator The validator address
     * @return The feedback value (0-100)
     */
    function getValidatorFeedback(uint256 agentId, address validator) external view returns (uint8) {
        return validatorFeedback[agentId][validator];
    }
}
