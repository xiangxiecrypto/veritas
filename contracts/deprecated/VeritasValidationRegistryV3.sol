// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICustomCheck.sol";

/**
 * @title VeritasValidationRegistryV3
 * @notice Handles all validation logic including custom checks
 * @dev Custom checks are external contracts implementing ICustomCheck
 *      New check types can be added WITHOUT updating this contract
 */
contract VeritasValidationRegistryV3 {
    address public owner;
    
    // ============================================
    // DATA STRUCTURES
    // ============================================
    
    /// @notice Custom check definition
    struct CustomCheck {
        address checkContract;   // External contract implementing ICustomCheck
        bytes params;            // Encoded params for the check
        int128 score;            // Score if check passes
        bool active;
        string description;
    }
    
    /// @notice Rule validation configuration
    struct RuleConfig {
        bytes32 urlHash;
        string dataKey;
        uint8 decimals;
        uint256 maxAge;
        bool active;
        mapping(uint256 => CustomCheck) checks;
        uint256 checkCount;
    }
    
    /// @notice Validation parameters passed from App
    struct ValidationParams {
        uint256 ruleId;
        uint256 agentId;
        bytes32 taskId;
        string attestationUrl;
        string attestationData;
        uint64 attestationTimestamp;
        uint256[] checkIds;
        address reputationRegistry;
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    mapping(uint256 => RuleConfig) public rules;
    mapping(bytes32 => bool) public usedTaskIds;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event RuleRegistered(uint256 indexed ruleId, bytes32 urlHash, string dataKey);
    event CheckAdded(uint256 indexed ruleId, uint256 indexed checkId, address checkContract, int128 score);
    event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score, int128 actualValue);
    event CheckFailed(uint256 indexed ruleId, uint256 indexed checkId);
    event AttestationValidated(uint256 indexed ruleId, uint256 indexed agentId, bytes32 indexed taskId, int128 totalScore);
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() {
        owner = msg.sender;
    }
    
    // ============================================
    // RULE MANAGEMENT
    // ============================================
    
    /**
     * @notice Register a rule's validation configuration
     * @dev Called by App contract when adding a rule
     */
    function registerRule(
        uint256 ruleId,
        bytes32 urlHash,
        string calldata dataKey,
        uint8 decimals,
        uint256 maxAge
    ) external onlyOwner {
        RuleConfig storage rule = rules[ruleId];
        rule.urlHash = urlHash;
        rule.dataKey = dataKey;
        rule.decimals = decimals;
        rule.maxAge = maxAge;
        rule.active = true;
        
        emit RuleRegistered(ruleId, urlHash, dataKey);
    }
    
    /**
     * @notice Add a custom check to a rule
     * @dev checkContract must implement ICustomCheck
     */
    function addCheck(
        uint256 ruleId,
        address checkContract,
        bytes calldata params,
        int128 score,
        string calldata description
    ) external onlyOwner returns (uint256 checkId) {
        require(rules[ruleId].active, "Rule not active");
        require(checkContract != address(0), "Invalid contract");
        
        checkId = rules[ruleId].checkCount++;
        
        CustomCheck storage check = rules[ruleId].checks[checkId];
        check.checkContract = checkContract;
        check.params = params;
        check.score = score;
        check.active = true;
        check.description = description;
        
        emit CheckAdded(ruleId, checkId, checkContract, score);
    }
    
    /**
     * @notice Deactivate a check
     */
    function deactivateCheck(uint256 ruleId, uint256 checkId) external onlyOwner {
        rules[ruleId].checks[checkId].active = false;
    }
    
    /**
     * @notice Activate a check
     */
    function activateCheck(uint256 ruleId, uint256 checkId) external onlyOwner {
        rules[ruleId].checks[checkId].active = true;
    }
    
    // ============================================
    // VALIDATION
    // ============================================
    
    /**
     * @notice Validate an attestation and grant reputation
     * @dev Called by App contract after attestation is verified
     */
    function validateAttestation(ValidationParams calldata params) external returns (bool, int128) {
        // Prevent replay
        require(!usedTaskIds[params.taskId], "Already validated");
        usedTaskIds[params.taskId] = true;
        
        RuleConfig storage rule = rules[params.ruleId];
        require(rule.active, "Rule inactive");
        
        // Validate URL
        require(
            keccak256(bytes(params.attestationUrl)) == rule.urlHash,
            "URL mismatch"
        );
        
        // Validate data contains key
        require(_containsDataKey(params.attestationData, rule.dataKey), "Data key not found");
        
        // Validate freshness
        require(
            block.timestamp - params.attestationTimestamp <= rule.maxAge,
            "Expired"
        );
        
        // Run custom checks
        int128 totalScore = 0;
        
        for (uint256 i = 0; i < params.checkIds.length; i++) {
            uint256 checkId = params.checkIds[i];
            CustomCheck storage check = rule.checks[checkId];
            
            if (check.active) {
                try ICustomCheck(check.checkContract).validate(
                    rule.dataKey,
                    params.attestationData,
                    check.params
                ) returns (bool passed, int128 actualValue) {
                    if (passed) {
                        totalScore += check.score;
                        emit CheckPassed(params.ruleId, checkId, check.score, actualValue);
                    } else {
                        emit CheckFailed(params.ruleId, checkId);
                    }
                } catch {
                    emit CheckFailed(params.ruleId, checkId);
                }
            }
        }
        
        // Grant reputation
        if (totalScore > 0 && params.reputationRegistry != address(0)) {
            (bool success, ) = params.reputationRegistry.call(
                abi.encodeWithSignature(
                    "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
                    params.agentId,
                    totalScore,
                    rule.decimals,
                    "veritas",
                    rule.dataKey,
                    params.attestationUrl,
                    params.attestationData,
                    params.taskId
                )
            );
            require(success, "Reputation grant failed");
        }
        
        emit AttestationValidated(params.ruleId, params.agentId, params.taskId, totalScore);
        
        return (true, totalScore);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getCheck(uint256 ruleId, uint256 checkId) external view returns (
        address checkContract,
        bytes memory params,
        int128 score,
        bool active,
        string memory description
    ) {
        CustomCheck storage check = rules[ruleId].checks[checkId];
        return (check.checkContract, check.params, check.score, check.active, check.description);
    }
    
    function getRuleConfig(uint256 ruleId) external view returns (
        bytes32 urlHash,
        string memory dataKey,
        uint8 decimals,
        uint256 maxAge,
        bool active,
        uint256 checkCount
    ) {
        RuleConfig storage rule = rules[ruleId];
        return (rule.urlHash, rule.dataKey, rule.decimals, rule.maxAge, rule.active, rule.checkCount);
    }
    
    // ============================================
    // INTERNAL HELPERS
    // ============================================
    
    function _containsDataKey(string memory data, string memory key) internal pure returns (bool) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        if (keyBytes.length == 0) return true;
        
        bytes memory searchPattern = abi.encodePacked('"', keyBytes, '":');
        if (dataBytes.length < searchPattern.length) return false;
        
        for (uint256 i = 0; i <= dataBytes.length - searchPattern.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < searchPattern.length; j++) {
                if (dataBytes[i + j] != searchPattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }
    
    // ============================================
    // ADMIN
    // ============================================
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
