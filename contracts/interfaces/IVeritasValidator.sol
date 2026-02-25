// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../mocks/IPrimusZKTLS.sol";

/**
 * @title IVeritasValidator
 * @notice Interface for Veritas validator contract
 * @dev Validates attestations from Primus zktls-core-sdk
 */
interface IVeritasValidator {
    /**
     * @notice Validate a Primus attestation against a rule
     * @param attestation The full attestation
     * @param ruleId The rule identifier
     * @return passed Whether validation passed
     * @return attestationHash The hash of the attestation
     */
    function validate(
        IPrimusZKTLS.Attestation calldata attestation,
        uint256 ruleId
    ) external returns (bool passed, bytes32 attestationHash);
    
    /**
     * @notice Get validation result by attestation hash
     */
    function getValidationResult(bytes32 attestationHash) external view returns (
        uint256 ruleId,
        bool passed,
        uint256 timestamp,
        address recipient,
        address validator
    );
    
    /**
     * @notice Check if an attestation has been validated
     */
    function isValidated(bytes32 attestationHash) external view returns (bool);
}
