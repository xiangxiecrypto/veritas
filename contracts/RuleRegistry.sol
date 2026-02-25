// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RuleRegistry
 * @notice Manages validation rules for Veritas Protocol
 * @dev Rules are bound to check contracts and define validation parameters
 */
contract RuleRegistry {
    
    struct Rule {
        uint256 id;
        string name;
        string description;
        address checkContract;    // Address of the check contract
        bytes checkData;          // Custom data for the check
        bool active;
        address creator;
        uint256 createdAt;
    }
    
    // Mapping from rule ID to Rule
    mapping(uint256 => Rule) public rules;
    
    // Array of all rule IDs
    uint256[] public ruleIds;
    
    // Admin addresses
    mapping(address => bool) public admins;
    
    // Next rule ID
    uint256 public nextRuleId = 1;
    
    // Events
    event RuleCreated(
        uint256 indexed ruleId,
        string name,
        address indexed checkContract
    );
    
    event RuleUpdated(
        uint256 indexed ruleId,
        bool active
    );
    
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    
    // Modifiers
    modifier onlyAdmin() {
        require(admins[msg.sender], "Veritas: not admin");
        _;
    }
    
    modifier ruleExists(uint256 _ruleId) {
        require(rules[_ruleId].id != 0, "Veritas: rule not exists");
        _;
    }
    
    /**
     * @notice Constructor
     */
    constructor() {
        admins[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }
    
    /**
     * @notice Add a new admin
     * @param _admin Address to add as admin
     */
    function addAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "Veritas: invalid address");
        require(!admins[_admin], "Veritas: already admin");
        
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }
    
    /**
     * @notice Remove an admin
     * @param _admin Address to remove
     */
    function removeAdmin(address _admin) external onlyAdmin {
        require(_admin != msg.sender, "Veritas: cannot remove self");
        require(admins[_admin], "Veritas: not admin");
        
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }
    
    /**
     * @notice Create a new rule
     * @param _name Rule name
     * @param _description Rule description
     * @param _checkContract Address of the check contract
     * @param _checkData Custom data for the check
     * @return ruleId The ID of the created rule
     */
    function createRule(
        string calldata _name,
        string calldata _description,
        address _checkContract,
        bytes calldata _checkData
    ) external onlyAdmin returns (uint256) {
        require(_checkContract != address(0), "Veritas: invalid check contract");
        require(bytes(_name).length > 0, "Veritas: empty name");
        
        uint256 ruleId = nextRuleId++;
        
        rules[ruleId] = Rule({
            id: ruleId,
            name: _name,
            description: _description,
            checkContract: _checkContract,
            checkData: _checkData,
            active: true,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        ruleIds.push(ruleId);
        
        emit RuleCreated(ruleId, _name, _checkContract);
        
        return ruleId;
    }
    
    /**
     * @notice Update rule status
     * @param _ruleId Rule ID
     * @param _active New status
     */
    function updateRuleStatus(uint256 _ruleId, bool _active) 
        external 
        onlyAdmin 
        ruleExists(_ruleId) 
    {
        rules[_ruleId].active = _active;
        emit RuleUpdated(_ruleId, _active);
    }
    
    /**
     * @notice Get rule details
     * @param _ruleId Rule ID
     * @return Rule struct
     */
    function getRule(uint256 _ruleId) 
        external 
        view 
        ruleExists(_ruleId) 
        returns (Rule memory) 
    {
        return rules[_ruleId];
    }
    
    /**
     * @notice Get all rule IDs
     * @return Array of rule IDs
     */
    function getAllRuleIds() external view returns (uint256[] memory) {
        return ruleIds;
    }
    
    /**
     * @notice Get rule count
     * @return Number of rules
     */
    function getRuleCount() external view returns (uint256) {
        return ruleIds.length;
    }
}
