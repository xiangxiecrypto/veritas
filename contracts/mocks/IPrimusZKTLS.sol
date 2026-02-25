// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPrimusZKTLS (Mock)
 * @notice Mock interface for Primus ZKTLS for testing purposes
 * @dev In production, use the real Primus contracts
 */
interface IPrimusZKTLS {
    
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

    /**
     * @notice Verify an attestation
     * @param attestation The attestation to verify
     * @dev In production, this verifies cryptographic signatures
     *      For testing, this mock always returns true
     */
    function verifyAttestation(Attestation calldata attestation) external view;
}
