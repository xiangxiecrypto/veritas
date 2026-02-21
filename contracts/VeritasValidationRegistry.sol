// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VeritasValidationRegistry
 * @notice ERC-8004 Validation Registry
 * @dev Enables agents to request verification and validators to provide responses
 */
contract VeritasValidationRegistry {
    address public identityRegistry;
    address public owner;
    
    struct ValidationInfo {
        address validatorAddress;
        uint256 agentId;
        string requestURI;
        bytes32 requestHash;
        uint8 response;
        string responseURI;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
    }
    
    mapping(bytes32 => ValidationInfo) public validations;
    mapping(uint256 => bytes32[]) public agentValidations;
    mapping(address => bytes32[]) public validatorRequests;
    
    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestURI,
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
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function initialize(address identityRegistry_) external {
        require(identityRegistry == address(0), "Already initialized");
        identityRegistry = identityRegistry_;
        owner = msg.sender;
    }
    
    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }
    
    /**
     * @notice Request validation from a validator
     * @param validatorAddress Address of validator smart contract
     * @param agentId Agent requesting validation
     * @param requestURI Off-chain data URI containing validation info
     * @param requestHash Commitment to request data (keccak256)
     */
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
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
            requestURI: requestURI,
            requestHash: requestHash,
            response: 0,
            responseURI: "",
            responseHash: bytes32(0),
            tag: "",
            lastUpdate: block.timestamp
        });
        
        agentValidations[agentId].push(requestHash);
        validatorRequests[validatorAddress].push(requestHash);
        
        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }
    
    /**
     * @notice Submit validation response
     * @param requestHash Hash of original request
     * @param response Score 0-100 (0=failed, 100=passed, or intermediate)
     * @param responseURI Optional off-chain evidence/audit URI
     * @param responseHash Optional commitment to responseURI
     * @param tag Optional categorization tag
     */
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
    
    /**
     * @notice Get validation status
     * @param requestHash Hash of validation request
     */
    function getValidationStatus(bytes32 requestHash) external view returns (
        address validatorAddress,
        uint256 agentId,
        uint8 response,
        bytes32 responseHash,
        string memory tag,
        uint256 lastUpdate
    ) {
        ValidationInfo storage v = validations[requestHash];
        return (
            v.validatorAddress,
            v.agentId,
            v.response,
            v.responseHash,
            v.tag,
            v.lastUpdate
        );
    }
    
    /**
     * @notice Get aggregated validation statistics for an agent
     * @param agentId Agent to query
     * @param validatorAddresses Optional filter for specific validators
     * @param tag Optional filter for specific tag
     */
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
            
            // Filter by validator if specified
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
            
            // Filter by tag if specified
            if (bytes(tag).length > 0 && !_eq(v.tag, tag)) continue;
            
            // Only count if validator has responded (response > 0)
            if (v.response > 0) {
                total += v.response;
                validCount++;
            }
        }
        
        averageResponse = validCount > 0 ? uint8(total / validCount) : 0;
        return (validCount, averageResponse);
    }
    
    /**
     * @notice Get all validation request hashes for an agent
     * @param agentId Agent to query
     */
    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory) {
        return agentValidations[agentId];
    }
    
    /**
     * @notice Get all validation request hashes for a validator
     * @param validatorAddress Validator to query
     */
    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory) {
        return validatorRequests[validatorAddress];
    }
    
    function _eq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
    
    function _ownerOf(uint256 agentId) internal view returns (address) {
        // Call identity registry to get owner
        (bool success, bytes memory result) = identityRegistry.staticcall(
            abi.encodeWithSignature("ownerOf(uint256)", agentId)
        );
        if (success && result.length >= 32) {
            return abi.decode(result, (address));
        }
        return address(0);
    }
}
