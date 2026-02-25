// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@primuslabs/zktls-contracts/src/IPrimusZKTLS.sol";

/**
 * @title IVeritasValidator
 * @notice Interface for Veritas validator contract
 * @dev Validates attestations from Primus zktls-core-sdk
 */
interface IVeritasValidator {
    /**
     * @notice Validate a Primus attestation against a rule
     * @param attestation The full attestation (contains all necessary data)
     *        - request: URL, method, headers, body
     *        - responseResolve: parsePath, parseType, keyName
     *        - data: Actual response data (JSON string)
     *        - signatures: Cryptographic proof
     * @param ruleId The rule identifier
     * @return passed Whether validation passed
     * @return attestationHash The hash of the attestation
     */
    function validate(
        Attestation calldata attestation,
        uint256 ruleId
    ) external returns (bool passed, bytes32 attestationHash);
    
    /**
     * @notice Get validation result by attestation hash
     * @param attestationHash The hash of the attestation
     * @return ruleId The rule used
     * @return passed Whether validation passed
     * @return timestamp When validation was performed
     */
    function getValidationResult(bytes32 attestationHash) external view returns (
        uint256 ruleId,
        bool passed,
        uint256 timestamp
    );
    
    /**
     * @notice Check if an attestation has been validated
     * @param attestationHash The hash of the attestation
     * @return Whether the attestation has been validated
     */
    function isValidated(bytes32 attestationHash) external view returns (bool);
}
