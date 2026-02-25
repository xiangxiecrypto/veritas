// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RuleRegistry
 * @notice Manages validation rules for Veritas Protocol
 * @dev Rules define how to validate attestations
 */
contract RuleRegistry {
    
    struct Rule {
        uint256 id;
        string name;
        string description;
        address checkContract;    // Check contract address
        bytes checkData;          // Validation parameters
        bool active;
        address creator;
        uint256 createdAt;
    }
    
    mapping(uint256 => Rule) public rules;
    uint256[] public ruleIds;
    mapping(address => bool) public admins;
    uint256 public nextRuleId = 1;
    
    event RuleCreated(
        uint256 indexed ruleId,
        string name,
        address indexed checkContract
    );
    
    event RuleUpdated(uint256 indexed ruleId, bool active);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    
    modifier onlyAdmin() {
        require(admins[msg.sender], "Veritas: not admin");
        _;
    }
    
    constructor() {
        admins[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }
    
    function addAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "Veritas: invalid address");
        require(!admins[_admin], "Veritas: already admin");
        
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }
    
    function removeAdmin(address _admin) external onlyAdmin {
        require(_admin != msg.sender, "Veritas: cannot remove self");
        require(admins[_admin], "Veritas: not admin");
        
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }
    
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
    
    function updateRuleStatus(uint256 _ruleId, bool _active) external onlyAdmin {
        require(rules[_ruleId].id != 0, "Veritas: rule not exists");
        
        rules[_ruleId].active = _active;
        emit RuleUpdated(_ruleId, _active);
    }
    
    function getRule(uint256 _ruleId) external view returns (Rule memory) {
        require(rules[_ruleId].id != 0, "Veritas: rule not exists");
        return rules[_ruleId];
    }
    
    function getAllRuleIds() external view returns (uint256[] memory) {
        return ruleIds;
    }
    
    function getRuleCount() external view returns (uint256) {
        return ruleIds.length;
    }
}
