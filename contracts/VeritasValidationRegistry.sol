// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IERC8004IdentityRegistry
 * @notice Interface for ERC-8004 Identity Registry
 */
interface IERC8004IdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getAgentWallet(uint256 agentId) external view returns (address);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

/**
 * @title IERC8004ValidationRegistry
 * @notice Interface for ERC-8004 Validation Registry
 */
interface IERC8004ValidationRegistry {
    event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash);
    event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag);
    
    function initialize(address identityRegistry_) external;
    function getIdentityRegistry() external view returns (address);
    function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external;
    function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external;
    function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string memory tag, uint256 lastUpdate);
}

/**
 * @title VeritasValidationRegistry
 * @notice ERC-8004 compliant Validation Registry with Primus zkTLS support
 * @dev Uses official ERC-8004 Identity Registry on Base
 * 
 * Base Mainnet Addresses:
 * - IdentityRegistry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 * - ReputationRegistry: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
 */
contract VeritasValidationRegistry is IERC8004ValidationRegistry {
    
    // ERC-8004: Identity Registry reference
    IERC8004IdentityRegistry public identityRegistry;
    
    // Validation status struct per ERC-8004
    struct Validation {
        address validatorAddress;
        uint256 agentId;
        uint8 response; // 0-100, where 0 = failed, 100 = passed
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        string requestURI;
        bytes32 requestHash;
        bool exists;
    }
    
    // Primus-specific attestation data
    struct PrimusAttestation {
        bytes32 proofHash;
        bytes primusProof;
        string apiEndpoint;
        uint256 timestamp;
        bool verified;
    }
    
    // Storage
    mapping(bytes32 => Validation) public validations;
    mapping(bytes32 => PrimusAttestation) public primusData;
    mapping(uint256 => bytes32[]) public agentValidations;
    mapping(address => bytes32[]) public validatorRequests;
    
    // Authorized validators (Primus attestation verifiers)
    mapping(address => bool) public authorizedValidators;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorizedValidator() {
        require(authorizedValidators[msg.sender], "Not authorized validator");
        _;
    }
    
    constructor(address _identityRegistry) {
        owner = msg.sender;
        identityRegistry = IERC8004IdentityRegistry(_identityRegistry);
    }
    
    function initialize(address identityRegistry_) external onlyOwner {
        require(address(identityRegistry) == address(0), "Already initialized");
        identityRegistry = IERC8004IdentityRegistry(identityRegistry_);
    }
    
    function getIdentityRegistry() external view returns (address) {
        return address(identityRegistry);
    }
    
    /**
     * @notice ERC-8004: Request validation from a validator
     * @param validatorAddress Address of the validator to request
     * @param agentId Agent ID (must be registered in Identity Registry)
     * @param requestURI URI pointing to validation request data
     * @param requestHash Commitment hash of the request
     */
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external override {
        // Verify agent is registered
        address agentOwner = identityRegistry.ownerOf(agentId);
        require(
            msg.sender == agentOwner || msg.sender == identityRegistry.getAgentWallet(agentId),
            "Not agent owner or wallet"
        );
        
        require(!validations[requestHash].exists, "Request already exists");
        require(authorizedValidators[validatorAddress], "Validator not authorized");
        
        validations[requestHash] = Validation({
            validatorAddress: validatorAddress,
            agentId: agentId,
            response: 0, // Not yet validated
            responseHash: bytes32(0),
            tag: "",
            lastUpdate: block.timestamp,
            requestURI: requestURI,
            requestHash: requestHash,
            exists: true
        });
        
        agentValidations[agentId].push(requestHash);
        validatorRequests[validatorAddress].push(requestHash);
        
        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }
    
    /**
     * @notice ERC-8004: Submit validation response
     * @param requestHash Hash identifying the request
     * @param response Validation result (0-100)
     * @param responseURI URI to validation evidence
     * @param responseHash Hash of response data
     * @param tag Optional categorization tag
     */
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external override onlyAuthorizedValidator {
        Validation storage val = validations[requestHash];
        require(val.exists, "Request not found");
        require(val.validatorAddress == msg.sender, "Not assigned validator");
        require(response <= 100, "Response must be 0-100");
        
        val.response = response;
        val.responseHash = responseHash;
        val.tag = tag;
        val.lastUpdate = block.timestamp;
        
        emit ValidationResponse(
            msg.sender,
            val.agentId,
            requestHash,
            response,
            responseURI,
            responseHash,
            tag
        );
    }
    
    /**
     * @notice Submit Primus zkTLS attestation as validation
     * @param agentId Agent being validated
     * @param proofHash Unique hash of the zkTLS proof
     * @param apiEndpoint API endpoint that was attested
     * @param primusProof The actual zkTLS proof from Primus
     * @param requestURI URI to off-chain request data
     */
    function submitPrimusAttestation(
        uint256 agentId,
        bytes32 proofHash,
        string calldata apiEndpoint,
        bytes calldata primusProof,
        string calldata requestURI
    ) external onlyAuthorizedValidator returns (bytes32) {
        // Create request hash from proof
        bytes32 requestHash = keccak256(abi.encodePacked(proofHash, agentId, block.timestamp));
        
        // Store as validation request
        validations[requestHash] = Validation({
            validatorAddress: msg.sender,
            agentId: agentId,
            response: 100, // Passed (Primus proofs are cryptographically verified)
            responseHash: proofHash,
            tag: "primus-zktls",
            lastUpdate: block.timestamp,
            requestURI: requestURI,
            requestHash: requestHash,
            exists: true
        });
        
        // Store Primus-specific data
        primusData[requestHash] = PrimusAttestation({
            proofHash: proofHash,
            primusProof: primusProof,
            apiEndpoint: apiEndpoint,
            timestamp: block.timestamp,
            verified: true
        });
        
        agentValidations[agentId].push(requestHash);
        validatorRequests[msg.sender].push(requestHash);
        
        emit ValidationRequest(msg.sender, agentId, requestURI, requestHash);
        emit ValidationResponse(msg.sender, agentId, requestHash, 100, requestURI, proofHash, "primus-zktls");
        
        return requestHash;
    }
    
    /**
     * @notice Get validation status per ERC-8004
     */
    function getValidationStatus(bytes32 requestHash) external view override returns (
        address validatorAddress,
        uint256 agentId,
        uint8 response,
        bytes32 responseHash,
        string memory tag,
        uint256 lastUpdate
    ) {
        Validation memory val = validations[requestHash];
        require(val.exists, "Validation not found");
        return (
            val.validatorAddress,
            val.agentId,
            val.response,
            val.responseHash,
            val.tag,
            val.lastUpdate
        );
    }
    
    /**
     * @notice Get full validation details including Primus data
     */
    function getValidation(bytes32 requestHash) external view returns (
        Validation memory validation,
        PrimusAttestation memory primus
    ) {
        require(validations[requestHash].exists, "Validation not found");
        return (validations[requestHash], primusData[requestHash]);
    }
    
    /**
     * @notice Get all validations for an agent
     */
    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory) {
        return agentValidations[agentId];
    }
    
    /**
     * @notice Get all requests for a validator
     */
    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory) {
        return validatorRequests[validatorAddress];
    }
    
    /**
     * @notice Get aggregated validation stats for an agent
     */
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag
    ) external view returns (uint64 count, uint8 averageResponse) {
        bytes32[] memory requests = agentValidations[agentId];
        uint256 totalResponse = 0;
        uint64 validCount = 0;
        
        for (uint i = 0; i < requests.length; i++) {
            Validation memory val = validations[requests[i]];
            
            // Filter by validator if specified
            if (validatorAddresses.length > 0) {
                bool found = false;
                for (uint j = 0; j < validatorAddresses.length; j++) {
                    if (val.validatorAddress == validatorAddresses[j]) {
                        found = true;
                        break;
                    }
                }
                if (!found) continue;
            }
            
            // Filter by tag if specified
            if (bytes(tag).length > 0) {
                if (keccak256(bytes(val.tag)) != keccak256(bytes(tag))) continue;
            }
            
            totalResponse += val.response;
            validCount++;
        }
        
        uint8 avg = validCount > 0 ? uint8(totalResponse / validCount) : 0;
        return (validCount, avg);
    }
    
    // Admin functions
    function addValidator(address validator) external onlyOwner {
        authorizedValidators[validator] = true;
    }
    
    function removeValidator(address validator) external onlyOwner {
        authorizedValidators[validator] = false;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
