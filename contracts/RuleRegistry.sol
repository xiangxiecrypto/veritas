// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RuleRegistry
 * @notice Rule registry with external check contracts
 */
contract RuleRegistry {
    
    struct Rule {
        uint256 id;
        string name;
        string description;
        address checkContract;  // ICustomCheck contract address
        string urlTemplate;     // URL pattern (e.g., "https://api.binance.com/*")
        string expectedDataKey; // Expected dataKey (e.g., "price", "balance")
        string expectedParsePath; // Expected parsePath (e.g., "$.price", "$.data.balance")
        bytes checkData;        // Custom check parameters
        bool active;
        uint256 maxAge;         // Timestamp validity in seconds
    }
    
    uint256 public nextRuleId = 1;
    mapping(uint256 => Rule) public rules;
    
    event RuleCreated(
        uint256 indexed id,
        string name,
        address indexed checkContract,
        string urlTemplate,
        uint256 maxAge
    );
    
    function createRule(
        string memory name,
        string memory description,
        address checkContract,
        string memory urlTemplate,
        string memory expectedDataKey,
        string memory expectedParsePath,
        bytes memory checkData,
        uint256 maxAge
    ) external returns (uint256 ruleId) {
        require(checkContract != address(0), "Invalid check contract");
        require(bytes(urlTemplate).length > 0, "Empty URL template");
        
        ruleId = nextRuleId++;
        
        rules[ruleId] = Rule({
            id: ruleId,
            name: name,
            description: description,
            checkContract: checkContract,
            urlTemplate: urlTemplate,
            expectedDataKey: expectedDataKey,
            expectedParsePath: expectedParsePath,
            checkData: checkData,
            active: true,
            maxAge: maxAge
        });
        
        emit RuleCreated(ruleId, name, checkContract, urlTemplate, maxAge);
        
        return ruleId;
    }
    
    function getRule(uint256 ruleId) external view returns (Rule memory) {
        return rules[ruleId];
    }
    
    function setRuleActive(uint256 ruleId, bool active) external {
        require(rules[ruleId].id != 0, "Rule not found");
        rules[ruleId].active = active;
    }
}
