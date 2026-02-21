// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VeritasValidationRegistryV4.sol";

// ============================================
// INTERFACES
// ============================================

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IPrimusTask {
    function submitTask(
        address sender,
        string calldata templateId,
        uint256 attestorCount,
        uint8 tokenSymbol,
        address callback
    ) external payable returns (bytes32 taskId);
    
    function queryTask(bytes32 taskId) external view returns (
        address requester,
        string memory templateId,
        uint256 attestorCount,
        uint8 tokenSymbol,
        address callback,
        uint8 taskStatus,
        TaskResult memory taskResult
    );
    
    function queryFee() external view returns (uint256 primusFee, uint256 attestorFee);
}

interface IPrimusNetworkCallback {
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external;
}

interface ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external returns (bool passed, int128 value);
}

// ============================================
// DATA STRUCTURES
// ============================================

struct TaskResult {
    Attestation attestation;
}

struct Attestation {
    address recipient;
    bytes request;
    bytes responseResolve;
    string data;
    uint64 timestamp;
}

// ============================================
// PRIMUS VERITAS APP V4
// ============================================

/**
 * @title PrimusVeritasAppV4
 * @notice ERC-8004 compliant Veritas App
 * @dev Receives attestation via IPrimusNetworkCallback
 */
contract PrimusVeritasAppV4 is IPrimusNetworkCallback {
    address public owner;
    VeritasValidationRegistryV4 public immutable registry;
    IPrimusTask public immutable primusTask;
    address public immutable identityRegistry;
    address public immutable reputationRegistry;
    
    struct VerificationRule {
        string templateId;
        string dataKey;
        uint8 decimals;
        uint256 maxAge;
        bool active;
        string description;
    }
    
    struct CustomCheck {
        address checkContract;
        bytes params;
        int128 score;
        bool active;
    }
    
    struct ValidationParams {
        uint256 ruleId;
        uint256[] checkIds;
        uint256 agentId;
        bool completed;
    }
    
    mapping(uint256 => VerificationRule) public rules;
    mapping(uint256 => mapping(uint256 => CustomCheck)) public checks;
    mapping(uint256 => uint256) public checkCount;
    uint256 public ruleCount;
    
    mapping(bytes32 => ValidationParams) public validationParams;
    
    event RuleAdded(uint256 indexed ruleId, string templateId);
    event CheckAdded(uint256 indexed ruleId, uint256 indexed checkId, int128 score);
    event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score, int128 value);
    event CheckFailed(uint256 indexed ruleId, uint256 indexed checkId);
    event ValidationRequested(bytes32 indexed taskId, uint256 agentId, uint256 ruleId);
    event ValidationCompleted(bytes32 indexed taskId, uint8 score);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyPrimus() {
        require(msg.sender == address(primusTask), "Only Primus");
        _;
    }
    
    constructor(
        address _registry,
        address _primusTask,
        address _identityRegistry,
        address _reputationRegistry
    ) {
        owner = msg.sender;
        registry = VeritasValidationRegistryV4(_registry);
        primusTask = IPrimusTask(_primusTask);
        identityRegistry = _identityRegistry;
        reputationRegistry = _reputationRegistry;
    }
    
    // ============================================
    // ADMIN
    // ============================================
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    // ============================================
    // RULE MANAGEMENT
    // ============================================
    
    function addRule(
        string calldata templateId,
        string calldata dataKey,
        uint8 decimals,
        uint256 maxAge,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;
        rules[ruleId] = VerificationRule({
            templateId: templateId,
            dataKey: dataKey,
            decimals: decimals,
            maxAge: maxAge,
            active: true,
            description: description
        });
        emit RuleAdded(ruleId, templateId);
    }
    
    function addCheck(
        uint256 ruleId,
        address checkContract,
        bytes calldata params,
        int128 score
    ) external onlyOwner returns (uint256 checkId) {
        checkId = checkCount[ruleId]++;
        checks[ruleId][checkId] = CustomCheck({
            checkContract: checkContract,
            params: params,
            score: score,
            active: true
        });
        emit CheckAdded(ruleId, checkId, score);
    }
    
    // ============================================
    // VALIDATION REQUEST
    // ============================================
    
    /**
     * @notice Request validation
     * @dev Fee from Primus network, taskId generated by Primus
     */
    function requestValidation(
        uint256 agentId,
        uint256 ruleId,
        uint256[] calldata checkIds
    ) external payable returns (bytes32 taskId) {
        // Verify agent ownership
        require(
            IERC721(identityRegistry).ownerOf(agentId) == msg.sender,
            "Not agent owner"
        );
        
        VerificationRule storage rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        
        // Get fee from Primus (NOT set by us)
        (uint256 primusFee, uint256 attestorFee) = primusTask.queryFee();
        uint256 totalFee = primusFee + (attestorFee * checkIds.length);
        
        require(msg.value == totalFee, "Invalid fee");
        
        // Validate checkIds
        for (uint256 i = 0; i < checkIds.length; i++) {
            require(checks[ruleId][checkIds[i]].active, "Check inactive");
        }
        
        // Submit to Primus
        taskId = primusTask.submitTask{value: msg.value}(
            msg.sender,
            rule.templateId,
            checkIds.length,
            0,  // ETH
            address(this)
        );
        
        // Store params
        ValidationParams storage p = validationParams[taskId];
        p.ruleId = ruleId;
        p.agentId = agentId;
        for (uint256 i = 0; i < checkIds.length; i++) {
            p.checkIds.push(checkIds[i]);
        }
        p.completed = false;
        
        // Register with ERC-8004
        registry.validationRequest(address(this), agentId, taskId);
        
        emit ValidationRequested(taskId, agentId, ruleId);
    }
    
    // ============================================
    // PRIMUS CALLBACK
    // ============================================
    
    /**
     * @notice Called by Primus when attestation complete
     * @dev Attestation.data contains JSON with attested values
     */
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external onlyPrimus {
        require(success, "Attestation failed");
        
        ValidationParams storage p = validationParams[taskId];
        require(p.agentId != 0, "Not found");
        require(!p.completed, "Already completed");
        
        Attestation calldata att = taskResult.attestation;
        VerificationRule storage rule = rules[p.ruleId];
        
        // Verify freshness
        require(block.timestamp - att.timestamp <= rule.maxAge, "Expired");
        
        // Run custom checks
        int128 totalScore = 0;
        int128 maxScore = 0;
        
        for (uint256 i = 0; i < p.checkIds.length; i++) {
            CustomCheck storage check = checks[p.ruleId][p.checkIds[i]];
            maxScore += check.score;
            
            if (check.active) {
                try ICustomCheck(check.checkContract).validate(
                    rule.dataKey,
                    att.data,
                    check.params
                ) returns (bool passed, int128 value) {
                    if (passed) {
                        totalScore += check.score;
                        emit CheckPassed(p.ruleId, p.checkIds[i], check.score, value);
                    } else {
                        emit CheckFailed(p.ruleId, p.checkIds[i]);
                    }
                } catch {
                    emit CheckFailed(p.ruleId, p.checkIds[i]);
                }
            }
        }
        
        // Calculate 0-100
        uint8 response = maxScore > 0 
            ? uint8((uint256(int256(totalScore)) * 100) / uint256(int256(maxScore)))
            : 0;
        
        // Respond to ERC-8004
        registry.validationResponse(
            taskId,
            response,
            _toHexString(taskId),
            keccak256(bytes(att.data)),
            rule.description
        );
        
        // Give reputation
        if (totalScore > 0 && reputationRegistry != address(0)) {
            _giveReputation(p.agentId, totalScore, rule, att.data, taskId);
        }
        
        p.completed = true;
        emit ValidationCompleted(taskId, response);
    }
    
    // ============================================
    // INTERNAL
    // ============================================
    
    function _giveReputation(
        uint256 agentId,
        int128 score,
        VerificationRule storage rule,
        string memory data,
        bytes32 taskId
    ) internal {
        reputationRegistry.call(
            abi.encodeWithSignature(
                "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
                agentId,
                score,
                rule.decimals,
                "veritas",
                rule.dataKey,
                rule.templateId,
                data,
                taskId
            )
        );
    }
    
    function _toHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(66);
        result[0] = '0';
        result[1] = 'x';
        for (uint256 i = 0; i < 32; i++) {
            result[2 + i * 2] = hexChars[uint8(data[i]) >> 4];
            result[3 + i * 2] = hexChars[uint8(data[i]) & 0x0f];
        }
        return string(result);
    }
}
