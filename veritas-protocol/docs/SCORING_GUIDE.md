# Veritas Enhanced Scoring System

## 🎯 Overview

The VeritasValidationRegistry now features **dynamic, freshness-based scoring** with admin-controlled configuration.

## 📊 Default Scoring

| Attestation Age | Score | Label |
|----------------|-------|-------|
| < 10 minutes | **100** | Fresh |
| < 30 minutes | **98** | Recent |
| < 60 minutes | **95** | Normal |
| > 60 minutes | ❌ | Rejected (Expired) |

## ⚙️ Configuration Functions (Owner Only)

### 1. Set Base Score

```javascript
// Update the base score (default: 95)
await veritas.setBaseScore(90, 0);  // 90 with 0 decimals

// View current config
const baseScore = await veritas.baseScore();        // 90
const decimals = await veritas.scoreDecimals();     // 0
```

### 2. Set Freshness Thresholds

```javascript
// Update freshness bonus thresholds
await veritas.setFreshnessThresholds(
  5 * 60,   // 5 minutes for max score
  15 * 60   // 15 minutes for high score
);

// View current thresholds
const f1 = await veritas.freshnessBonus1();  // 300 (5 min)
const f2 = await veritas.freshnessBonus2();  // 900 (15 min)
```

### 3. Transfer Ownership

```javascript
// Transfer ownership to new address
await veritas.transferOwnership(newOwnerAddress);

// Check owner
const owner = await veritas.owner();
```

## 🧮 Score Calculation

### On-Chain Function

```solidity
function calculateScore(uint256 age) public view returns (int128 score) {
    if (age < freshnessBonus1) {
        return SCORE_FRESH;   // 100
    } else if (age < freshnessBonus2) {
        return SCORE_RECENT;  // 98
    } else {
        return baseScore;     // 95 (configurable)
    }
}
```

### Example Usage

```javascript
// Check score for specific age
const age = 15 * 60;  // 15 minutes
const score = await veritas.calculateScore(age);
console.log(`Score: ${score}`);  // 98
```

## 📝 Implementation Examples

### Example 1: Use Default Scoring

```javascript
// No configuration needed
// Just validate attestation - score calculated automatically
const tx = await veritas.validateAttestation(
  agentId,
  taskId,
  urlHash,
  dataHash
);

// Score will be 100 if < 10min old
// Score will be 98 if < 30min old
// Score will be 95 if < 60min old
```

### Example 2: Aggressive Freshness (Stricter)

```javascript
// Configure for stricter scoring
await veritas.setFreshnessThresholds(
  5 * 60,   // 100 score only if < 5min
  10 * 60   // 98 score only if < 10min
);

// Now:
// < 5min → 100
// < 10min → 98
// < 60min → 95
```

### Example 3: Lenient Scoring (More Forgiving)

```javascript
// Configure for more forgiving scoring
await veritas.setFreshnessThresholds(
  30 * 60,  // 100 score if < 30min
  45 * 60   // 98 score if < 45min
);

// Now:
// < 30min → 100
// < 45min → 98
// < 60min → 95
```

### Example 4: Custom Base Score

```javascript
// Lower base score for normal attestations
await veritas.setBaseScore(85, 0);

// Now:
// < 10min → 100
// < 30min → 98
// < 60min → 85 (was 95)
```

### Example 5: Decimals for Precision

```javascript
// Use decimals for fine-grained scoring
await veritas.setBaseScore(950, 1);  // 95.0

// Score range: 950-1000 with 1 decimal
// Average calculation: sum / count / 10^1
```

## 🔄 Migration from Old Contract

The old contract (hardcoded 95):

```solidity
// Old
reputationRegistry.giveFeedback(agentId, 95, 0, ...);
```

New contract (dynamic scoring):

```solidity
// New
int128 score = calculateScore(age);
reputationRegistry.giveFeedback(agentId, score, scoreDecimals, ...);
```

**Benefits:**
- ✅ Rewards fresh attestations (100 vs 95)
- ✅ Incentivizes quick verification
- ✅ Configurable by owner
- ✅ Future-proof scoring system

## 🧪 Testing

```bash
# Test scoring system
npx hardhat run veritas-protocol/scripts/test-scoring.js --network base-sepolia

# Deploy new contract
npx hardhat run veritas-protocol/scripts/deploy-veritas-v2.js --network base-sepolia
```

## 📊 Reputation Calculation

The ERC-8004 reputation registry calculates:

```javascript
averageScore = reputationSum / reputationCount

// Example with new scoring:
// Attestation 1: 100 (fresh)
// Attestation 2: 98 (recent)
// Attestation 3: 95 (normal)

sum = 100 + 98 + 95 = 293
count = 3
average = 293 / 3 = 97.67
```

**Impact:**
- Old system: Always 95 → Average always 95
- New system: 100, 98, 95 → Average ≈ 97-98

## 🔐 Security

### Access Control

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}
```

Only the contract owner can:
- Update base score
- Update freshness thresholds
- Transfer ownership

### Immutability

These are **immutable** (cannot be changed):
- `identityRegistry`
- `reputationRegistry`
- `primusTaskContract`
- `MAX_AGE` (1 hour)

## 🎛️ Admin Dashboard Example

```javascript
async function configureScoring(contract, options) {
  const {
    baseScore = 95,
    decimals = 0,
    freshness1 = 10 * 60,
    freshness2 = 30 * 60
  } = options;

  // Update base score
  await contract.setBaseScore(baseScore, decimals);

  // Update freshness thresholds
  await contract.setFreshnessThresholds(freshness1, freshness2);

  console.log("Configuration updated!");
}

// Usage
await configureScoring(veritas, {
  baseScore: 90,
  freshness1: 5 * 60,
  freshness2: 15 * 60
});
```

## 📈 Monitoring Reputation

```javascript
async function monitorReputation(reputationRegistry, agentId) {
  const sum = await reputationRegistry.reputationSum(agentId);
  const count = await reputationRegistry.reputationCount(agentId);

  const average = count > 0 ? Number(sum) / Number(count) : 0;

  console.log(`Agent ${agentId}:`);
  console.log(`  Total Attestations: ${count}`);
  console.log(`  Average Score: ${average.toFixed(2)}`);
}
```

## 🚀 Best Practices

1. **Start with defaults**: Test with default scoring (100/98/95)
2. **Monitor averages**: Check how fresh attestations affect reputation
3. **Adjust gradually**: Only tighten/loosen thresholds after analysis
4. **Document changes**: Track all configuration updates
5. **Use multisig**: Consider using Gnosis Safe for ownership

## 🔗 Related

- [Quick Reference](./QUICK_REFERENCE.md)
- [Detailed Scoring Guide](./REPUTATION_SCORING.md)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
