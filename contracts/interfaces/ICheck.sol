// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ICheck
 * @notice Interface for check contracts
 * @dev Each check contract implements specific validation logic
 */
interface ICheck {
    /**
     * @notice Validate an attestation
     * @param attestationData The full attestation data (includes request, response, parsePath)
     * @param checkData Custom data for this check
     * @return passed Whether validation passed (true/false)
     */
    function validate(
        bytes calldata attestationData,  // Full attestation (includes data + parsePath)
        bytes calldata checkData
    ) external pure returns (bool passed);
}
