// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ICheck
 * @notice Interface for check contracts
 * @dev Validates attestation against rule expectations
 */
interface ICheck {
    /**
     * @notice Validate attestation against rule
     * @param attestationData The full attestation data
     * @param checkData Rule's validation parameters
     * @return passed Whether validation passed (true/false)
     * 
     * Validation includes:
     * 1. Verify attestation structure matches rule expectations
     * 2. Verify attestation.request matches rule.checkData.request
     * 3. Verify attestation.reponseResolve matches rule.checkData.responseResolve
     * 4. Verify attestation.data matches expected patterns
     */
    function validate(
        bytes calldata attestationData,
        bytes calldata checkData
    ) external pure returns (bool passed);
    
    /**
     * @notice Verify if attestation structure is compatible with check data
     * @param attestationData The attestation to verify
     * @param checkData The check data to match against
     * @return compatible Whether the attestation can be validated with this check
     */
    function isCompatible(
        bytes calldata attestationData,
        bytes calldata checkData
    ) external pure returns (bool compatible);
}
