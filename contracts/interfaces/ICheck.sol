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
     * @param attestation The attestation data from zktls-core-sdk
     * @param checkData Custom data for this check
     * @param responseData The response data from API call
     * @return passed Whether validation passed (true/false)
     */
    function validate(
        bytes calldata attestation,
        bytes calldata checkData,
        bytes calldata responseData
    ) external view returns (bool passed);
}
