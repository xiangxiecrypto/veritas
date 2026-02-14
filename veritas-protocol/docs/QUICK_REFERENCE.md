# Quick Answer: Reputation Score

## The Data Structure

Your contract calls:

```solidity
reputationRegistry.giveFeedback(
    agentId,         // uint256 - Agent receiving reputation
    reputationScore, // int128 - Configurable score (default: 95)
    scoreDecimals,   // uint8 - Decimals (default: 0 = integer)
    "primus-zktls",  // string - Tag1
    url,             // string - Tag2
    url,             // string - Endpoint
    att.data,        // string - Attestation data
    taskId           // bytes32 - Unique hash
);
```

## Is the Score Required?

**✅ YES** - The `value` parameter is **required**.

## How to Configure the Score

### Default Configuration

```solidity
reputationScore = 95;   // Default: 95/100
scoreDecimals = 0;      // 0 = integer scale
```

### Change the Score (Owner Only)

```javascript
// Update to 100/100
await veritas.setReputationScore(100, 0);

// Update to 90/100
await veritas.setReputationScore(90, 0);

// Update to 4.5/5 (with decimals)
await veritas.setReputationScore(45, 1);  // 45 / 10 = 4.5
```

## Examples

### Example 1: Keep Default (95/100)
```javascript
// No configuration needed
await veritas.validateAttestation(agentId, taskId, urlHash, dataHash);
// → Reputation: 95/100
```

### Example 2: Set to 100/100
```javascript
await veritas.setReputationScore(100, 0);
await veritas.validateAttestation(agentId, taskId, urlHash, dataHash);
// → Reputation: 100/100
```

### Example 3: Use Decimals (4.5/5 scale)
```javascript
await veritas.setReputationScore(45, 1);  // 4.5 with 1 decimal
await veritas.validateAttestation(agentId, taskId, urlHash, dataHash);
// → Reputation: 4.5/5
```

## Check Current Configuration

```javascript
const score = await veritas.reputationScore();
const decimals = await veritas.scoreDecimals();
console.log(`Current: ${score} with ${decimals} decimals`);
```

## Summary

- **Default**: 95 (integer, 0 decimals)
- **Configurable**: Owner can change anytime
- **Simple**: One score for all valid attestations
- **Flexible**: Supports different scales (0-100, 0-5, etc.)
