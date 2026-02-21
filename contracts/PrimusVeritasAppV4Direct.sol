// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VeritasValidationRegistryV4.sol";

interface ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external returns (bool passed, int128 value);
}

/**
 * @title PrimusVeritasAppV4Direct
 * @notice Accepts attestations directly from Primus SDK
 */
contract PrimusVeritasAppV4Direct {
    address public owner;
    VeritasValidationRegistryV4 public immutable registry;
    address public constant PRIMUS_ATTESTOR = 0x0DE886e31723e64Aa72e51977B14475fB66a9f72;
    
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
    
    mapping(uint256 => VerificationRule) public rules;
    mapping(uint256 => mapping(uint256 => CustomCheck)) public checks;
    mapping(uint256 => uint256) public checkCount;
    uint256 public ruleCount;
    mapping(bytes32 => bool) public processedAttestations;
    
    event AttestationProcessed(bytes32 indexed hash, address attestor, string data, uint8 score);
    event CheckPassed(uint256 indexed ruleId, uint256 indexed checkId, int128 score, int128 value);
    event CheckFailed(uint256 indexed ruleId, uint256 indexed checkId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _registry) {
        owner = msg.sender;
        registry = VeritasValidationRegistryV4(_registry);
    }
    
    function addRule(
        string calldata templateId,
        string calldata dataKey,
        uint8 decimals,
        uint256 maxAge,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        ruleId = ruleCount++;
        rules[ruleId] = VerificationRule(templateId, dataKey, decimals, maxAge, true, description);
    }
    
    function addCheck(
        uint256 ruleId,
        address checkContract,
        bytes calldata params,
        int128 score
    ) external onlyOwner returns (uint256 checkId) {
        checkId = checkCount[ruleId]++;
        checks[ruleId][checkId] = CustomCheck(checkContract, params, score, true);
    }
    
    function processAttestation(
        bytes32 attestationHash,
        address attestor,
        string calldata attestationData,
        uint64 timestamp,
        uint256 ruleId,
        uint256[] calldata checkIds
    ) external {
        require(attestor == PRIMUS_ATTESTOR, "Invalid attestor");
        require(!processedAttestations[attestationHash], "Already processed");
        
        VerificationRule storage rule = rules[ruleId];
        require(rule.active, "Rule inactive");
        require(block.timestamp - timestamp <= rule.maxAge, "Expired");
        
        processedAttestations[attestationHash] = true;
        
        int128 totalScore = 0;
        int128 maxScore = 0;
        
        for (uint256 i = 0; i < checkIds.length; i++) {
            CustomCheck storage check = checks[ruleId][checkIds[i]];
            maxScore += check.score;
            
            if (check.active) {
                try ICustomCheck(check.checkContract).validate(
                    rule.dataKey,
                    attestationData,
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
        
        uint8 response = maxScore > 0 
            ? uint8((uint256(int256(totalScore)) * 100) / uint256(int256(maxScore)))
            : 0;
        
        string memory hashHex = _toHexString(attestationHash);
        bytes32 dataHash = keccak256(bytes(attestationData));
        
        registry.validationResponse(attestationHash, response, hashHex, dataHash, rule.description);
        
        emit AttestationProcessed(attestationHash, attestor, attestationData, response);
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
