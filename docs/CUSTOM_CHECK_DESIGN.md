# Per-Rule Custom Check Design

## Overview

Keep one `VeritasValidationRegistryV2` contract, but add per-rule custom check configuration in `PrimusVeritasAppV2`.

## Design

### Custom Check Types

```solidity
enum CustomCheckType {
    NONE,           // No custom check (default)
    MIN_THRESHOLD,  // value >= minValue
    MAX_THRESHOLD,  // value <= maxValue
    RANGE,          // minValue <= value <= maxValue
    EXACT_MATCH,    // value == exactValue
    CONTAINS        // value contains substring
}

struct CustomCheck {
    CustomCheckType checkType;
    int128 minValue;      // For MIN_THRESHOLD, RANGE
    int128 maxValue;      // For MAX_THRESHOLD, RANGE
    int128 exactValue;    // For EXACT_MATCH
    string containsStr;   // For CONTAINS
}
```

### Updated Rule Struct

```solidity
struct VerificationRule {
    // Existing fields
    bytes32 urlHash;
    string url;
    string dataKey;
    int128 score;
    uint8 decimals;
    uint256 maxAge;
    bool active;
    string description;
    
    // NEW: Per-rule custom check
    CustomCheckType checkType;
    int128 checkMinValue;
    int128 checkMaxValue;
    string checkStringValue;
}
```

### Updated addRule Function

```solidity
function addRule(
    string calldata url,
    string calldata dataKey,
    int128 score,
    uint8 decimals,
    uint256 maxAge,
    string calldata description,
    // NEW parameters
    CustomCheckType checkType,
    int128 checkMinValue,
    int128 checkMaxValue,
    string calldata checkStringValue
) external onlyOwner returns (uint256 ruleId);
```

### Updated customCheck Function

```solidity
function customCheck(
    uint256 ruleId,
    string calldata attestationUrl,
    string calldata attestationData,
    uint64 attestationTimestamp
) external override returns (bool) {
    VerificationRule storage rule = rules[ruleId];
    
    // No custom check
    if (rule.checkType == CustomCheckType.NONE) {
        return true;
    }
    
    // Extract value from attestation data
    int128 value = _extractValue(attestationData, rule.dataKey);
    
    // Apply check based on type
    if (rule.checkType == CustomCheckType.MIN_THRESHOLD) {
        return value >= rule.checkMinValue;
    }
    else if (rule.checkType == CustomCheckType.MAX_THRESHOLD) {
        return value <= rule.checkMaxValue;
    }
    else if (rule.checkType == CustomCheckType.RANGE) {
        return value >= rule.checkMinValue && value <= rule.checkMaxValue;
    }
    else if (rule.checkType == CustomCheckType.EXACT_MATCH) {
        return value == rule.checkMinValue;
    }
    else if (rule.checkType == CustomCheckType.CONTAINS) {
        return _contains(attestationData, rule.checkStringValue);
    }
    
    return true;
}
```

## Usage Examples

### Example 1: Price must be >= $50,000

```javascript
await app.addRule(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    'btcPrice',
    100, 2, 3600, 'BTC/USD',
    CustomCheckType.MIN_THRESHOLD,  // checkType
    50000,                          // minValue (50000.00)
    0,                              // maxValue (unused)
    ''                              // stringValue (unused)
);
```

### Example 2: Price must be in range $50,000 - $100,000

```javascript
await app.addRule(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    'btcPrice',
    100, 2, 3600, 'BTC/USD in range',
    CustomCheckType.RANGE,          // checkType
    50000,                          // minValue
    100000,                         // maxValue
    ''                              // stringValue (unused)
);
```

### Example 3: No custom check (default)

```javascript
await app.addRule(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    'btcPrice',
    100, 2, 3600, 'BTC/USD basic',
    CustomCheckType.NONE,           // checkType = NONE
    0, 0, ''                         // all unused
);
```

### Example 4: Data must contain specific string

```javascript
await app.addRule(
    'https://api.example.com/status',
    'status',
    50, 0, 3600, 'API Status Check',
    CustomCheckType.CONTAINS,        // checkType
    0, 0,                            // unused
    'active'                         // must contain "active"
);
```

## Benefits

1. **Single Validation Contract** - No need for multiple validator contracts
2. **Per-Rule Configuration** - Each rule has its own check
3. **Gas Efficient** - Check logic in same contract
4. **Extensible** - Easy to add more check types

## Extension: Custom Check Contract (Optional)

For complex checks that can't be expressed with predefined types:

```solidity
// Add to rule struct
address customCheckContract;  // If checkType == CUSTOM_CONTRACT

// Interface
interface ICustomCheck {
    function check(
        uint256 ruleId,
        string calldata url,
        string calldata data,
        uint64 timestamp
    ) external returns (bool);
}

// In customCheck function
if (rule.checkType == CustomCheckType.CUSTOM_CONTRACT) {
    return ICustomCheck(rule.customCheckContract).check(ruleId, url, data, timestamp);
}
```

---

Should I implement this design? Do you want:
1. **Predefined check types only** (simpler, gas efficient)
2. **With custom contract option** (more flexible, but adds complexity)
