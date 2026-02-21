// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VeritasValidationRegistryV4.sol";

// ============================================
// INTERFACES
// ============================================

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external returns (bool passed, int128 value);
}

// ============================================
// DATA STRUCTURES (Must match Primus exactly)
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
// PRIMUS VERITAS APP V4 - REAL CALLBACK
// ============================================

/**
 * @title PrimusVeritasAppV4Callback
 * @notice Implements IPrimusNetworkCallback to receive real Primus attestations
 * @dev Primus calls reportTaskResultCallback() after attestation
 */
contract PrimusVeritasAppV4Callback {
    address public owner;
    VeritasValidationRegistryV4 public immutable registry;
    
    // Real Primus attestor on Base Sepolia
    address public constant PRIMUS_ATTESTOR = 0x0DE886e31723e64Aa72e51977B14475fB66a9f72;
    
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
    
    struct PendingValidation {
        uint256 ruleId;
        uint256[] checkIds;
        uint256 agentId;
        address requester;
    }
    
    mapping(uint256 => VerificationRule) public rules;
    mapping(uint256 => mapping(uint256 => CustomCheck)) public checks;
    mapping(uint256 => uint256) public checkCount;
    uint256 public ruleCount;
    
    // Track pending validations by taskId
    mapping(bytes32 => PendingValidation) public pendingValidations;
    mapping(bytes32 => bool) public completedValidations;
    
    // Events
    event RuleAdded(uint256 indexed ruleId, string templateId);
    event CheckAdded(uint256 indexed ruleId, uint256 indexed checkId, int128 score);
    event AttestationReceived(bytes32 indexed taskId, address attestor, string data);
    event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score, int128 value);
    event CheckFailed(uint256 indexed ruleId, uint256 indexed checkId);
    event ValidationCompleted(bytes32 indexed taskId, uint8 score);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyPrimus() {
        require(msg.sender == PRIMUS_ATTESTOR, "Only Primus");
        _;
    }
    
    constructor(
        address _registry,
        address _identityRegistry,
        address _reputationRegistry
    ) {
        owner = msg.sender;
        registry = VeritasValidationRegistryV4(_registry);
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
    // PRIMUS CALLBACK - Called by real Primus network
    // ============================================
    
    /**
     * @notice Called by Primus when attestation is complete
     * @dev This is the REAL callback from Primus attestor
     * @param taskId The task identifier
     * @param taskResult The attestation result
     * @param success Whether attestation succeeded
     */
    function reportTaskResultCallback(
        bytes32 taskId,
        TaskResult calldata taskResult,
        bool success
    ) external onlyPrimus {
        require(success, "Attestation failed");
        require(!completedValidations[taskId], "Already completed");
        
        Attestation calldata att = taskResult.attestation;
        
        emit AttestationReceived(taskId, msg.sender, att.data);
        
        // Check if we have a pending validation for this taskId
        PendingValidation storage pending = pendingValidations[taskId];
        
        // If no pending validation, use default rule 0 with all checks
        uint256 ruleId = pending.ruleId > 0 ? pending.ruleId : 0;
        uint256[] memory checkIds = pending.checkIds.length > 0 
            ? pending.checkIds 
            : _getAllCheckIds(ruleId);
        
        VerificationRule storage rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        
        // Verify freshness
        require(block.timestamp - att.timestamp <= rule.maxAge, "Expired");
        
        // Run custom checks
        int128 totalScore = 0;
        int128 maxScore = 0;
        
        for (uint256 i = 0; i < checkIds.length; i++) {
            CustomCheck storage check = checks[ruleId][checkIds[i]];
            maxScore += check.score;
            
            if (check.active) {
                try ICustomCheck(check.checkContract).validate(
                    rule.dataKey,
                    att.data,
                    check.params
                ) returns (bool passed, int128 value) {
                    if (passed) {
                        totalScore += check.score;
                        emit CheckPassed(ruleId, checkIds[i], check.score, value);
                    } else {
                        emit CheckFailed(ruleId, checkIds[i]);
                    }
                } catch {
                    emit CheckFailed(ruleId, checkIds[i]);
                }
            }
        }
        
        // Calculate 0-100 score
        uint8 response = maxScore > 0 
            ? uint8((uint256(int256(totalScore)) * 100) / uint256(int256(maxScore)))
            : 0;
        
        // Store result in Registry
        registry.validationResponse(
            taskId,
            response,
            _toHexString(taskId),
            keccak256(bytes(att.data)),
            rule.description
        );
        
        // Mark as completed
        completedValidations[taskId] = true;
        
        emit ValidationCompleted(taskId, response);
    }
    
    // ============================================
    // VALIDATION REQUEST
    // ============================================
    
    /**
     * @notice Request validation for a specific rule and checks
     * @dev Registers pending validation to be processed on callback
     */
    function requestValidation(
        uint256 agentId,
        uint256 ruleId,
        uint256[] calldata checkIds,
        bytes32 taskId
    ) external {
        // Verify agent ownership
        require(
            IERC721(identityRegistry).ownerOf(agentId) == msg.sender,
            "Not agent owner"
        );
        
        VerificationRule storage rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        
        // Store pending validation
        PendingValidation storage pending = pendingValidations[taskId];
        pending.ruleId = ruleId;
        pending.agentId = agentId;
        pending.requester = msg.sender;
        for (uint256 i = 0; i < checkIds.length; i++) {
            pending.checkIds.push(checkIds[i]);
        }
    }
    
    // ============================================
    // INTERNAL
    // ============================================
    
    function _getAllCheckIds(uint256 ruleId) internal view returns (uint256[] memory) {
        uint256 count = checkCount[ruleId];
        uint256[] memory ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = i;
        }
        return ids;
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
