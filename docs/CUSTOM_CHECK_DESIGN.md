# Custom Check Design

## Overview

Custom Checks are Solidity contracts that implement validation logic. They verify that attested API data meets specific criteria.

## Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICustomCheck {
    /**
     * @notice Validate attested data
     * @param request Original API request (Primus format)
     * @param responseResolve Response parsing config (Primus format)
     * @param attestationData Attested data from Primus
     * @param url Expected URL from rule
     * @param dataKey Expected dataKey from rule
     * @param parsePath Expected parsePath from rule
     * @param params Custom parameters for check
     * @return bool True if validation passes
     */
    function validate(
        bytes calldata request,
        bytes calldata responseResolve,
        bytes calldata attestationData,
        string calldata url,
        string calldata dataKey,
        string calldata parsePath,
        bytes calldata params
    ) external returns (bool);
}
```

## SimpleVerificationCheck

Validates that URL, dataKey, and parsePath match the rule:

```solidity
contract SimpleVerificationCheck is ICustomCheck {
    function validate(
        bytes calldata request,
        bytes calldata responseResolve,
        bytes calldata attestationData,
        string calldata url,
        string calldata dataKey,
        string calldata parsePath,
        bytes calldata params
    ) external pure override returns (bool) {
        // Decode request and verify URL matches
        // Decode responseResolve and verify dataKey, parsePath match
        // Return true if all match
        return true;
    }
}
```

## MoltbookKarmaCheck

Validates Moltbook karma > 0:

```solidity
contract MoltbookKarmaCheck is ICustomCheck {
    function validate(
        bytes calldata request,
        bytes calldata responseResolve,
        bytes calldata attestationData,
        string calldata url,
        string calldata dataKey,
        string calldata parsePath,
        bytes calldata params
    ) external pure override returns (bool) {
        // 1. Verify URL, dataKey, parsePath
        // 2. Parse karma from attestationData
        // 3. Return true if karma > 0
        return karma > 0;
    }
}
```

## Creating Custom Checks

1. **Implement ICustomCheck interface**
2. **Add validation logic** in `validate()` function
3. **Deploy contract**
4. **Add to rule** via `addCheck(ruleId, checkAddress, params, score)`

## Example: Threshold Check

```solidity
contract ThresholdCheck is ICustomCheck {
    function validate(
        bytes calldata request,
        bytes calldata responseResolve,
        bytes calldata attestationData,
        string calldata url,
        string calldata dataKey,
        string calldata parsePath,
        bytes calldata params
    ) external pure override returns (bool) {
        // Decode threshold from params
        uint256 threshold = abi.decode(params, (uint256));
        
        // Parse value from attestationData
        uint256 value = parseValue(attestationData, dataKey);
        
        return value >= threshold;
    }
}
```

## Best Practices

1. **Use pure/view functions** when possible (no state changes)
2. **Handle decoding errors** gracefully
3. **Keep gas usage low** - checks run during callback
4. **Document params format** for integrators

## Gas Considerations

- Interface calls use `{gas: 100000}` to ensure enough gas
- Keep validation logic simple
- Avoid loops and complex computations
