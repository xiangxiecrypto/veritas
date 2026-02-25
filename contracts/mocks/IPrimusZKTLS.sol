// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPrimusZKTLS
 * @notice Interface for Primus ZKTLS contract on Base Sepolia
 * @dev Matches the actual Primus contract at 0xCE7cefB3B5A7eB44B59F60327A53c9Ce53B0afdE
 */
interface IPrimusZKTLS {
    
    struct AttNetworkRequest {
        string url;
        string header;
        string method;
        string body;
    }

    struct AttNetworkResponseResolve {
        string keyName;
        string parseType;
        string parsePath;
    }

    struct Attestor {
        address attestorAddr;
        string url;
    }

    struct Attestation {
        address recipient;
        AttNetworkRequest request;
        AttNetworkResponseResolve[] reponseResolve;
        string data;
        string attConditions;
        uint64 timestamp;
        string additionParams;
        Attestor[] attestors;
        bytes[] signatures;
    }

    /**
     * @notice Verify an attestation
     * @param attestation The attestation to verify
     * @dev Verifies cryptographic signatures from attestors
     */
    function verifyAttestation(Attestation calldata attestation) external view;
}
