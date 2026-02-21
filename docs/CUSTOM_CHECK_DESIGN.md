# Custom Check Design

## Overview

Custom checks allow flexible validation of attestation data. Each rule can have multiple checks with different validation logic.

## Architecture

### ICustomCheck Interface

```solidity
interface ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external returns (bool passed, int128 value);
}
```

### Check Implementation

Checks are deployed as separate contracts in the `checks/` folder:

#### PriceRangeCheck

Validates numeric values within a specified range:

```solidity
contract PriceRangeCheck is ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external override returns (bool passed, int128 value) {
        // Decode params: (int128 minPrice, int128 maxPrice)
        (int128 minPrice, int128 maxPrice) = abi.decode(
            params,
            (int128, int128)
        );
        
        // Extract price from attestation JSON
        value = extractValue(attestationData, dataKey);
        
        // Check if within range
        passed = (value >= minPrice && value <= maxPrice);
    }
}
```

**Usage:**
```javascript
// Check if BTC price is between $60,000 and $100,000
const params = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // In cents
);
await app.addCheck(
    ruleId,
    priceCheck.address,
    params,
    100  // Score weight
);
```

#### ThresholdCheck

Validates values against a threshold:

```solidity
contract ThresholdCheck is ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external override returns (bool passed, int128 value) {
        // Decode params: (int128 threshold, bool isMin)
        (int128 threshold, bool isMin) = abi.decode(
            params,
            (int128, bool)
        );
        
        value = extractValue(attestationData, dataKey);
        
        if (isMin) {
            passed = (value >= threshold);  // Minimum threshold
        } else {
            passed = (value <= threshold);  // Maximum threshold
        }
    }
}
```

**Usage:**
```javascript
// Check if value >= threshold
const params = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'bool'],
    [1000000, true]  // value >= 1,000,000
);
await app.addCheck(ruleId, thresholdCheck.address, params, 50);
```

## Score Calculation

Each check has a weight. The final score is calculated as:

```
Score = (Sum of passed check weights) / (Total weights) * 100
```

**Example:**
- Check 1: Weight 100, Passed ✓
- Check 2: Weight 50, Passed ✓
- Check 3: Weight 50, Failed ✗

Score = (100 + 50) / (100 + 50 + 50) * 100 = 150 / 200 * 100 = 75/100

## Adding Custom Checks

### 1. Implement ICustomCheck

```solidity
contract MyCustomCheck is ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external override returns (bool passed, int128 value) {
        // Your validation logic here
        // Parse attestation JSON
        // Extract value using dataKey
        // Validate against params
        // Return (passed, value)
    }
}
```

### 2. Deploy Check Contract

```javascript
const MyCheck = await ethers.getContractFactory("MyCustomCheck");
const myCheck = await MyCheck.deploy();
await myCheck.deployed();
```

### 3. Add to Rule

```javascript
const params = ethers.utils.defaultAbiCoder.encode(
    [...],  // Your params
    [...]
);
await app.addCheck(ruleId, myCheck.address, params, scoreWeight);
```

## Best Practices

1. **Return extracted value**: Always return the extracted value for debugging
2. **Handle errors gracefully**: Return false if parsing fails
3. **Use appropriate decimals**: Match the decimals specified in the rule
4. **Document params**: Clearly document what params your check expects
5. **Test thoroughly**: Test with various valid and invalid inputs

## Example: Complete Setup

```javascript
// Deploy checks
const PriceCheck = await ethers.getContractFactory("PriceRangeCheck");
const priceCheck = await PriceCheck.deploy();

// Add rule
await app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "btcPrice",
    2,      // decimals
    3600,   // max age (1 hour)
    "BTC Price Check"
);

// Add checks
const params = ethers.utils.defaultAbiCoder.encode(
    ['int128', 'int128'],
    [6000000, 10000000]  // $60k-$100k in cents
);
await app.addCheck(0, priceCheck.address, params, 100);

// Request validation
await app.requestValidation(agentId, ruleId, [], 1, { value: fee });
```
