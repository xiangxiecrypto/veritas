// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ValidationRegistry
 * @notice Veritas Protocol - Stores and verifies zkTLS attestations
 * @dev Extends ERC-8004 with zkTLS proof validation
 */
contract ValidationRegistry is Ownable, ReentrancyGuard {
    
    struct Attestation {
        bytes32 proofHash;
        address agent;
        uint256 timestamp;
        string apiEndpoint;
        bytes32 requestHash;
        bytes32 responseHash;
        bytes primusProof;
        bool isValid;
    }
    
    // Proof hash => Attestation
    mapping(bytes32 => Attestation) public attestations;
    
    // Agent address => Array of proof hashes
    mapping(address => bytes32[]) public agentAttestations;
    
    // Identity Registry (ERC-8004)
    address public identityRegistry;
    
    // Primus verification contract
    address public primusVerifier;
    
    event AttestationSubmitted(
        bytes32 indexed proofHash,
        address indexed agent,
        uint256 timestamp,
        string apiEndpoint
    );
    
    event AttestationVerified(
        bytes32 indexed proofHash,
        bool isValid,
        uint256 verifiedAt
    );
    
    constructor(address _identityRegistry, address _primusVerifier) {
        identityRegistry = _identityRegistry;
        primusVerifier = _primusVerifier;
    }
    
    /**
     * @notice Submit a new zkTLS attestation
     * @param _proofHash Unique hash of the proof
     * @param _apiEndpoint API endpoint that was called
     * @param _requestHash Hash of the request
     * @param _responseHash Hash of the response
     * @param _primusProof The zkTLS proof from Primus
     */
    function submitAttestation(
        bytes32 _proofHash,
        string calldata _apiEndpoint,
        bytes32 _requestHash,
        bytes32 _responseHash,
        bytes calldata _primusProof
    ) external nonReentrant returns (bool) {
        require(attestations[_proofHash].timestamp == 0, "Proof already exists");
        require(bytes(_apiEndpoint).length > 0, "Invalid endpoint");
        
        // TODO: Verify agent is registered in IdentityRegistry
        // TODO: Verify Primus proof validity
        
        Attestation memory attestation = Attestation({
            proofHash: _proofHash,
            agent: msg.sender,
            timestamp: block.timestamp,
            apiEndpoint: _apiEndpoint,
            requestHash: _requestHash,
            responseHash: _responseHash,
            primusProof: _primusProof,
            isValid: true // TODO: Actually verify
        });
        
        attestations[_proofHash] = attestation;
        agentAttestations[msg.sender].push(_proofHash);
        
        emit AttestationSubmitted(
            _proofHash,
            msg.sender,
            block.timestamp,
            _apiEndpoint
        );
        
        return true;
    }
    
    /**
     * @notice Verify an attestation's validity
     * @param _proofHash The proof hash to verify
     * @return isValid Whether the proof is valid
     * @return timestamp When the proof was submitted
     */
    function verifyAttestation(
        bytes32 _proofHash
    ) external view returns (bool isValid, uint256 timestamp) {
        Attestation memory att = attestations[_proofHash];
        return (att.isValid, att.timestamp);
    }
    
    /**
     * @notice Get full attestation details
     * @param _proofHash The proof hash
     * @return Attestation struct with all details
     */
    function getAttestation(
        bytes32 _proofHash
    ) external view returns (Attestation memory) {
        return attestations[_proofHash];
    }
    
    /**
     * @notice Get all attestations for an agent
     * @param _agent The agent address
     * @return Array of proof hashes
     */
    function getAgentAttestations(
        address _agent
    ) external view returns (bytes32[] memory) {
        return agentAttestations[_agent];
    }
    
    /**
     * @notice Update the Primus verifier contract address
     * @param _newVerifier New verifier address
     */
    function updatePrimusVerifier(address _newVerifier) external onlyOwner {
        primusVerifier = _newVerifier;
    }
    
    /**
     * @notice Update the Identity Registry address
     * @param _newRegistry New registry address
     */
    function updateIdentityRegistry(address _newRegistry) external onlyOwner {
        identityRegistry = _newRegistry;
    }
}
