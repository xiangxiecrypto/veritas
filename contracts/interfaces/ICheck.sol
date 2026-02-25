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
     */
    function validate(
        bytes calldata attestationData,
        bytes calldata checkData
    ) external pure returns (bool passed);
}
