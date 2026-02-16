// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IVeritasApp.sol";

/**
 * @title VeritasValidationRegistry V2
 * @notice Fixed version - removed tx.origin check
 */
contract VeritasValidationRegistryV2 {
    address public owner;
    mapping(bytes32 => bool) public usedTaskIds;
    
    struct ValidationParams {
        uint256 agentId;
        bytes32 taskId;
        address appContract;
        uint256 ruleId;
        // Attestation data
        string attestationUrl;
        string attestationData;
        uint64 attestationTimestamp;
        // Rule parameters
        bytes32 expectedUrlHash;
        string expectedDataKey;
        int128 score;
        uint8 decimals;
        uint256 maxAge;
        // Reputation registry
        address reputationRegistry;
    }
    
    event AttestationValidated(
        uint256 indexed agentId,
        bytes32 indexed taskId,
        address indexed appContract,
        string url,
        string dataKey,
        int128 score,
        bool success
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function validateAttestation(ValidationParams calldata params) external returns (bool) {
        require(!usedTaskIds[params.taskId], "Already validated");
        usedTaskIds[params.taskId] = true;
        
        // Validate URL matches expected hash
        require(keccak256(bytes(params.attestationUrl)) == params.expectedUrlHash, "URL mismatch");
        
        // Validate data contains expected key
        require(_containsDataKey(params.attestationData, params.expectedDataKey), "Data key not found");
        
        // Check attestation freshness
        require(block.timestamp - params.attestationTimestamp <= params.maxAge, "Expired");
        
        // Call custom check on app contract if needed
        IVeritasApp(params.appContract).customCheck(
            params.ruleId, params.attestationUrl, params.attestationData, params.attestationTimestamp
        );
        
        // Grant reputation if registry provided
        if (params.reputationRegistry != address(0)) {
            (bool success, ) = params.reputationRegistry.call(
                abi.encodeWithSignature(
                    "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
                    params.agentId, params.score, params.decimals, "veritas", params.expectedDataKey,
                    params.attestationUrl, params.attestationData, params.taskId
                )
            );
            require(success, "Reputation grant failed");
        }
        
        emit AttestationValidated(params.agentId, params.taskId, params.appContract, 
            params.attestationUrl, params.expectedDataKey, params.score, true);
        return true;
    }
    
    function _containsDataKey(string memory data, string memory key) internal pure returns (bool) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        if (keyBytes.length == 0) return true;
        
        bytes memory searchPattern = abi.encodePacked('"', keyBytes, '":');
        if (dataBytes.length < searchPattern.length) return false;
        
        for (uint i = 0; i <= dataBytes.length - searchPattern.length; i++) {
            bool found = true;
            for (uint j = 0; j < searchPattern.length; j++) {
                if (dataBytes[i + j] != searchPattern[j]) { found = false; break; }
            }
            if (found) return true;
        }
        return false;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
