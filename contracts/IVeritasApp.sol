// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IVeritasApp
 * @notice Standard interface for Veritas apps
 * @dev Any app must implement this to work with ValidationRegistry
 */
interface IVeritasApp {
    /**
     * @notice Custom validation check
     * @param ruleId Which rule is being verified
     * @param attestationUrl URL from attestation
     * @param attestationData Data from attestation
     * @param attestationTimestamp Timestamp from attestation
     * @return success Whether custom check passed
     */
    function customCheck(
        uint256 ruleId,
        string calldata attestationUrl,
        string calldata attestationData,
        uint64 attestationTimestamp
    ) external returns (bool);
}
