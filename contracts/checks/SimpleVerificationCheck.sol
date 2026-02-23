// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ICustomCheck.sol";

contract SimpleVerificationCheck is ICustomCheck {
    function validate(
        bytes calldata,
        bytes calldata,
        string calldata,
        string calldata,
        string calldata,
        string calldata,
        bytes calldata
    ) external pure override returns (bool) {
        return true;
    }
}
