# Veritas Protocol - Reputation Scoring System

## 📊 Data Structure Sent to Reputation Contract

When your VeritasValidationRegistry calls `reputationRegistry.giveFeedback()`, it sends the following data structure:

### Function Signature

```solidity
function giveFeedback(
    uint256 agentId,        // The agent receiving reputation
    int128 value,           // The score value (can be negative)
    uint8 valueDecimals,    // Number of decimals for value
    string calldata tag1,   // Primary tag (e.g., "primus-zktls")
    string calldata tag2,   // Secondary tag (e.g., URL)
    string calldata endpoint, // API endpoint
    string calldata feedbackURI, // Attestation data
    bytes32 feedbackHash    // Task ID for uniqueness
) external;
```

### Current Implementation

```solidity
reputationRegistry.giveFeedback(
    agentId,                 // From function parameter
    95,                      // ⭐ SCORE VALUE (hardcoded)
    0,                       // valueDecimals (0 = integer)
    "primus-zktls",          // tag1: attestation type
    att.request[0].url,      // tag2: verified URL
    att.request[0].url,      // endpoint: same as tag2
    att.data,                // feedbackURI: attestation JSON
    taskId                   // feedbackHash: unique ID
);
```

## 🔢 Understanding the Score Value

### Is the Score Required?

**Yes**, the `value` parameter is required. It represents the reputation score being granted to the agent.

### How Scores Work in ERC-8004

The reputation contract maintains:
- `reputationSum[agentId]` - Cumulative sum of all scores
- `reputationCount[agentId]` - Number of feedback entries

**Average reputation = `reputationSum / reputationCount`**

### Value Parameters Explained

| Parameter | Type | Current Value | Meaning |
|-----------|------|---------------|---------|
| `value` | int128 | 95 | The score (-∞ to +∞, can be negative) |
| `valueDecimals` | uint8 | 0 | 0 = integer, 1 = tenths, 2 = hundredths, etc. |

### Examples

```solidity
// Example 1: 95/100 (current implementation)
giveFeedback(agentId, 95, 0, ...)  // value = 95

// Example 2: 4.5/5 stars (using decimals)
giveFeedback(agentId, 45, 1, ...)  // value = 4.5 (45 / 10^1)

// Example 3: Percentage with decimals
giveFeedback(agentId, 9532, 2, ...) // value = 95.32 (9532 / 10^2)

// Example 4: Binary (pass/fail)
giveFeedback(agentId, 1, 0, ...)   // value = 1 (pass)
giveFeedback(agentId, 0, 0, ...)   // value = 0 (fail)

// Example 5: Negative feedback
giveFeedback(agentId, -10, 0, ...) // value = -10 (penalty)
```

## 🎯 Recommended Scoring Strategies

### Option 1: Fixed Score (Current)
```solidity
// Simple: every valid attestation gets 95
int128 score = 95;
uint8 decimals = 0;
```
**Pros**: Simple, predictable
**Cons**: Doesn't differentiate quality

### Option 2: Dynamic Score Based on Freshness
```solidity
// fresher = higher score
uint256 age = block.timestamp - att.timestamp;
int128 score;
if (age < 10 minutes) {
    score = 100;
} else if (age < 30 minutes) {
    score = 95;
} else {
    score = 90;
}
```

### Option 3: Score Based on Data Quality
```solidity
// parse att.data and score based on completeness
int128 score = 95; // base score

// bonus for additional verification
if (hasMultipleAttestors) score += 5;
if (hasProofOfFreshness) score += 5;
```

### Option 4: Configurable Score
```solidity
mapping(address => int128) public validatorScores;

function setValidatorScore(int128 score) external {
    validatorScores[msg.sender] = score;
}

function validateAttestation(...) external {
    int128 score = validatorScores[msg.sender];
    if (score == 0) score = 95; // default
    reputationRegistry.giveFeedback(agentId, score, 0, ...);
}
```

## 🧮 Score Calculation Examples

### Scenario 1: First Attestation
```
Agent ID: 1
Initial: sum=0, count=0
After: sum=95, count=1
Average: 95/1 = 95
```

### Scenario 2: Multiple Attestations
```
Initial: sum=95, count=1 (avg=95)
New feedback: 100
After: sum=195, count=2
Average: 195/2 = 97.5
```

### Scenario 3: With Decimals (0-5 scale)
```
First: 4.5 stars → sum=45, count=1 (decimals=1)
Second: 5 stars → sum=95, count=2
Average: 95/2 / 10 = 4.75 stars
```

## 💡 Recommendations for Your Use Case

### For zkTLS Attestations

Since you're verifying cryptographically-proven data, I recommend:

**Option A: Binary Trust Score**
```solidity
int128 score = 100;  // Verified = full trust
uint8 decimals = 0;
```

**Option B: Graduated Freshness Score**
```solidity
uint256 age = block.timestamp - att.timestamp;
int128 score;

if (age < 1 hours) {
    score = 100;  // Fresh: full score
} else if (age < 6 hours) {
    score = 90;   // Recent: high score
} else {
    score = 80;   // Old: reduced score
}
```

**Option C: Weighted by Attestor**
```solidity
// If you have multiple attestors with different trust levels
mapping(address => int128) public attestorWeights;

int128 score = 100 * attestorWeights[attestor] / 100;
```

## 🔍 How to Query Reputation

```javascript
const { ethers } = require("ethers");

const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");
const reputation = new ethers.Contract(
  "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  [
    "function reputationSum(uint256) view returns (int128)",
    "function reputationCount(uint256) view returns (uint256)"
  ],
  provider
);

const agentId = 1;
const sum = await reputation.reputationSum(agentId);
const count = await reputation.reputationCount(agentId);

const avgScore = count > 0 ? Number(sum) / Number(count) : 0;
console.log(`Agent ${agentId} Reputation: ${avgScore.toFixed(2)} (${count} attestations)`);
```

## 🚀 Implementation Example

Update your contract to support configurable scoring:

```solidity
contract VeritasValidationRegistry {
    // Configurable base score
    int128 public baseScore = 95;
    uint8 public scoreDecimals = 0;

    // Admin can update
    function setBaseScore(int128 _score, uint8 _decimals) external onlyOwner {
        baseScore = _score;
        scoreDecimals = _decimals;
    }

    function validateAttestation(...) external returns (bool) {
        // ... verification logic ...

        // Use configurable score
        reputationRegistry.giveFeedback(
            agentId,
            baseScore,
            scoreDecimals,
            "primus-zktls",
            att.request[0].url,
            att.request[0].url,
            att.data,
            taskId
        );

        return true;
    }
}
```

## 📋 Summary

| Aspect | Recommendation |
|--------|---------------|
| **Required?** | Yes, `value` is required |
| **Default** | 95 (integer) |
| **Decimals** | 0 (for 0-100 scale) |
| **Negative** | Allowed (for penalties) |
| **Range** | int128: -170141183460469231731687303715884105728 to +170141183460469231731687303715884105727 |
| **Best Practice** | Use 0-100 with decimals=0 for simplicity |

## 🔗 Related

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Reputation Contract](https://sepolia.basescan.org/address/0x8004B663056A597Dffe9eCcC1965A193B7388713)
- [Veritas Contract](https://sepolia.basescan.org/address/0x33327EE8e1C100c773632626eB45F14eEcf37fed)
