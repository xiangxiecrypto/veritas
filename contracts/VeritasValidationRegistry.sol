// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IVeritasApp.sol";

/**
 * @title VeritasValidationRegistry
 * @notice Pure validation - NO dependencies, just validates data
 * @dev Receives attestation data as parameters (no Primus dependency)
 */
contract VeritasValidationRegistry {
    address public owner;
    
    // Anti-replay
    mapping(bytes32 => bool) public usedTaskIds;
    
    // Events
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
    
    /**
     * @notice Validate attestation data (passed as parameters)
     * @dev NO Primus dependency - apps pass attestation data
     */
    function validateAttestation(
        uint256 agentId,
        bytes32 taskId,
        address appContract,
        uint256 ruleId,
        // Attestation data (from app)
        string calldata attestationUrl,
        string calldata attestationData,
        uint64 attestationTimestamp,
        address attestationRecipient,
        // Standard check parameters (from app)
        bytes32 expectedUrlHash,
        string calldata expectedDataKey,
        int128 score,
        uint8 decimals,
        uint256 maxAge,
        // External contracts
        address reputationRegistry
    ) external returns (bool) {
        // Anti-replay
        require(!usedTaskIds[taskId], "Already validated");
        usedTaskIds[taskId] = true;
        
        // ✅ STANDARD CHECKS (on attestation data):
        
        // 1. URL verification
        require(
            keccak256(bytes(attestationUrl)) == expectedUrlHash,
            "URL mismatch"
        );
        
        // 2. Data key verification
        require(
            _containsDataKey(attestationData, expectedDataKey),
            "Data key not found"
        );
        
        // 3. Recipient verification
        require(attestationRecipient == tx.origin, "Recipient mismatch");
        
        // 4. Freshness verification
        uint256 age = block.timestamp - attestationTimestamp;
        require(age <= maxAge, "Expired");
        
        // ✅ CUSTOM CHECK (call app):
        IVeritasApp(appContract).customCheck(
            ruleId,
            attestationUrl,
            attestationData,
            attestationTimestamp
        );
        
        // Grant reputation (call external contract)
        if (reputationRegistry != address(0)) {
            (bool success, ) = reputationRegistry.call(
                abi.encodeWithSignature(
                    "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
                    agentId,
                    score,
                    decimals,
                    "veritas",
                    expectedDataKey,
                    attestationUrl,
                    attestationData,
                    taskId
                )
            );
            require(success, "Reputation grant failed");
        }
        
        emit AttestationValidated(
            agentId,
            taskId,
            appContract,
            attestationUrl,
            expectedDataKey,
            score,
            true
        );
        
        return true;
    }
    
    /**
     * @notice Check if data contains the expected key
     */
    function _containsDataKey(string memory data, string memory key) internal pure returns (bool) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        
        if (keyBytes.length == 0) {
            return true;
        }
        
        // Look for "key": pattern
        bytes memory searchPattern = abi.encodePacked('"', keyBytes, '":');
        
        if (dataBytes.length < searchPattern.length) {
            return false;
        }
        
        for (uint i = 0; i <= dataBytes.length - searchPattern.length; i++) {
            bool found = true;
            for (uint j = 0; j < searchPattern.length; j++) {
                if (dataBytes[i + j] != searchPattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        
        return false;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
