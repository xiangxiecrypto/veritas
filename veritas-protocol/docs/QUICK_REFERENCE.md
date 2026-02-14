# Quick Answer: Reputation Score

## The Data Structure

Your contract calls:

```solidity
reputationRegistry.giveFeedback(
    agentId,         // uint256 - Agent receiving reputation
    95,              // int128 - Score value (THIS IS REQUIRED)
    0,               // uint8 - Decimals (0 = integer)
    "primus-zktls",  // string - Tag1
    url,             // string - Tag2
    url,             // string - Endpoint
    att.data,        // string - Attestation data
    taskId           // bytes32 - Unique hash
);
```

## Is the Score Required?

**✅ YES** - The `value` parameter (second parameter, currently 95) is **required**.

## What Does It Mean?

- **Current Value**: 95 (out of 100)
- **Type**: `int128` (can be negative)
- **Decimals**: 0 (integer score)
- **Meaning**: Each valid attestation gives 95 reputation points

## How the Score Works

The reputation contract maintains:

```solidity
reputationSum[agentId] = total of all scores
reputationCount[agentId] = number of feedbacks

Average = reputationSum / reputationCount
```

**Example:**
```
1st attestation: 95 → sum=95, count=1 → avg=95
2nd attestation: 95 → sum=190, count=2 → avg=95
3rd attestation: 100 → sum=290, count=3 → avg=96.67
```

## How to Set It Properly

### Option 1: Keep Current (Recommended for now)
```solidity
int128 score = 95;  // Good score for valid attestation
uint8 decimals = 0; // Integer
```

### Option 2: Make it Configurable
Add to your contract:

```solidity
int128 public baseScore = 95;

function setBaseScore(int128 newScore) external onlyOwner {
    baseScore = newScore;
}

// In validateAttestation:
reputationRegistry.giveFeedback(
    agentId,
    baseScore,  // Use configurable value
    0,
    // ... rest
);
```

### Option 3: Dynamic Based on Freshness
```solidity
uint256 age = block.timestamp - att.timestamp;
int128 score;

if (age < 1 hours) {
    score = 100;  // Fresh
} else if (age < 6 hours) {
    score = 90;   // Recent
} else {
    score = 80;   // Old
}
```

## Score Examples

```solidity
// 95/100 (current)
giveFeedback(agentId, 95, 0, ...)

// 4.5/5 stars (with decimals)
giveFeedback(agentId, 45, 1, ...)  // 45 / 10 = 4.5

// Pass/fail
giveFeedback(agentId, 1, 0, ...)   // Pass

// Negative feedback
giveFeedback(agentId, -10, 0, ...) // Penalty
```

## Recommendation

For zkTLS attestations:
- **Keep it simple**: Use 95 with decimals=0
- **Add configuration**: Allow owner to adjust if needed
- **Consider freshness**: Give bonus points for very recent attestations

## Full Documentation

See `veritas-protocol/docs/REPUTATION_SCORING.md` for detailed examples and strategies.
