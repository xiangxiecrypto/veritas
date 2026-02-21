// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VeritasValidationRegistry
 * @notice ERC-8004 Validation Registry
 */
contract VeritasValidationRegistry {
    address public immutable identityRegistry;
    
    struct ValidationInfo {
        address validatorAddress;
        uint256 agentId;
        bytes32 requestHash;
        uint8 response;
        string responseURI;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        bool responded;
    }
    
    mapping(bytes32 => ValidationInfo) public validations;
    mapping(uint256 => bytes32[]) public agentValidations;
    mapping(address => bytes32[]) public validatorRequests;
    
    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash
    );
    
    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );
    
    constructor(address _identityRegistry) {
        identityRegistry = _identityRegistry;
    }
    
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        bytes32 requestHash
    ) external {
        // Verify caller owns the agent
        require(
            _ownerOf(agentId) == msg.sender,
            "Not agent owner"
        );
        
        validations[requestHash] = ValidationInfo({
            validatorAddress: validatorAddress,
            agentId: agentId,
            requestHash: requestHash,
            response: 0,
            responseURI: "",
            responseHash: bytes32(0),
            tag: "",
            lastUpdate: block.timestamp,
            responded: false
        });
        
        agentValidations[agentId].push(requestHash);
        validatorRequests[validatorAddress].push(requestHash);
        
        emit ValidationRequest(validatorAddress, agentId, requestHash);
    }
    
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external {
        ValidationInfo storage v = validations[requestHash];
        
        require(v.validatorAddress != address(0), "Not found");
        require(msg.sender == v.validatorAddress, "Not validator");
        require(response <= 100, "Invalid response");
        
        v.response = response;
        v.responseURI = responseURI;
        v.responseHash = responseHash;
        v.tag = tag;
        v.lastUpdate = block.timestamp;
        v.responded = true;
        
        emit ValidationResponse(
            v.validatorAddress,
            v.agentId,
            requestHash,
            response,
            responseURI,
            responseHash,
            tag
        );
    }
    
    function getValidationStatus(bytes32 requestHash) external view returns (
        address validatorAddress,
        uint256 agentId,
        uint8 response,
        string memory responseURI,
        bytes32 responseHash,
        string memory tag,
        uint256 lastUpdate
    ) {
        ValidationInfo storage v = validations[requestHash];
        return (
            v.validatorAddress,
            v.agentId,
            v.response,
            v.responseURI,
            v.responseHash,
            v.tag,
            v.lastUpdate
        );
    }
    
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag
    ) external view returns (uint64 count, uint8 averageResponse) {
        bytes32[] storage hashes = agentValidations[agentId];
        uint256 total = 0;
        uint64 validCount = 0;
        
        for (uint256 i = 0; i < hashes.length; i++) {
            ValidationInfo storage v = validations[hashes[i]];
            
            if (validatorAddresses.length > 0) {
                bool found = false;
                for (uint256 j = 0; j < validatorAddresses.length; j++) {
                    if (v.validatorAddress == validatorAddresses[j]) {
                        found = true;
                        break;
                    }
                }
                if (!found) continue;
            }
            
            if (bytes(tag).length > 0 && !_eq(v.tag, tag)) continue;
            
            if (v.responded) {
                total += v.response;
                validCount++;
            }
        }
        
        averageResponse = validCount > 0 ? uint8(total / validCount) : 0;
        return (validCount, averageResponse);
    }
    
    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory) {
        return agentValidations[agentId];
    }
    
    function _eq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
    
    // Internal function to get owner - will be called via delegatecall or override
    function _ownerOf(uint256) internal view virtual returns (address) {
        return address(0);
    }
}
