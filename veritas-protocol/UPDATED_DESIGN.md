# Veritas App Architecture - Updated Design

## 🔄 Changes Based on Feedback

### Change 1: Separation of Concerns

**Before**: App did validation
```solidity
// VeritasApp validated attestation
require(keccak256(bytes(att.request[0].url)) == keccak256(bytes(rule.url)));
require(att.recipient == msg.sender);
require(age <= rule.maxAgeSeconds);
```

**After**: App orchestrates, Validator validates
```solidity
// VeritasApp just calls validator
bool success = validator.validateAndGrant(
    agentId, taskId, rule.url, rule.dataKey, score, decimals, maxAge
);
```

### Change 2: Rules Structure

**Before**: Included data hash
```solidity
struct VerificationRule {
    string url;
    string dataKey;
    bytes32 expectedDataHash;  // ❌ Data varies per agent
    int128 reputationScore;
    uint8 scoreDecimals;
    uint256 maxAgeSeconds;
    bool active;
    string description;
}
```

**After**: Only data key
```solidity
struct VerificationRule {
    string url;                  // URL to verify
    string dataKey;              // JSON key (e.g., "btcPrice")
    int128 reputationScore;      // Score to grant
    uint8 scoreDecimals;         // 0 = integer
    uint256 maxAgeSeconds;       // Freshness
    bool active;
    string description;
    // ✅ NO data hash - data varies per agent
}
```

### Change 3: Direct String Comparison

**Before**: Used hashes
```solidity
bytes32 expectedUrlHash = keccak256(rule.url);
bytes32 actualUrlHash = keccak256(att.request[0].url);
require(actualUrlHash == expectedUrlHash);
```

**After**: Direct comparison (still using keccak256 for gas efficiency)
```solidity
require(
    keccak256(bytes(att.request[0].url)) == keccak256(bytes(expectedUrl)),
    "URL mismatch"
);
```

---

## 🏗️ Updated Architecture

### VeritasApp (Orchestrator)

**Responsibilities**:
- ✅ Store verification rules (URL, dataKey, score, maxAge)
- ✅ Submit tasks to Primus
- ✅ Track verification requests
- ✅ Call validator for validation
- ❌ Does NOT validate attestation

**Key Functions**:
```solidity
function addRule(
    string url,
    string dataKey,      // NO hash - just key name
    int128 score,
    uint8 decimals,
    uint256 maxAge,
    string description
) external onlyOwner returns (uint256)

function requestVerification(
    uint256 ruleId,
    uint256 agentId
) external returns (bytes32 taskId)

function completeVerification(bytes32 taskId) external returns (bool) {
    // Just call validator - app does NOT validate
    validator.validateAndGrant(
        agentId, taskId, rule.url, rule.dataKey, score, decimals, maxAge
    );
}
```

### VeritasValidator (Validator)

**Responsibilities**:
- ✅ Fetch attestation from Primus
- ✅ Validate URL (direct string comparison)
- ✅ Validate data key exists
- ✅ Validate recipient
- ✅ Validate freshness
- ✅ Grant reputation

**Key Function**:
```solidity
function validateAndGrant(
    uint256 agentId,
    bytes32 taskId,
    string expectedUrl,       // Direct string, not hash
    string expectedDataKey,   // Direct string, not hash
    int128 score,
    uint8 decimals,
    uint256 maxAge
) external onlyAuthorizedApp returns (bool) {
    // 1. Fetch attestation
    TaskInfo memory taskInfo = primusTask.queryTask(taskId);
    Attestation memory att = taskInfo.taskResults[0].attestation;
    
    // 2. Validate URL (direct comparison)
    require(
        keccak256(bytes(att.request[0].url)) == keccak256(bytes(expectedUrl)),
        "URL mismatch"
    );
    
    // 3. Validate recipient
    require(att.recipient == tx.origin, "Recipient mismatch");
    
    // 4. Validate data key exists
    require(_containsDataKey(att.data, expectedDataKey), "Data key not found");
    
    // 5. Validate freshness
    require(block.timestamp - att.timestamp <= maxAge, "Expired");
    
    // 6. Grant reputation
    reputation.giveFeedback(agentId, score, decimals, ...);
    
    return true;
}
```

---

## 📊 Workflow

### Complete Flow

```
WALLET                          VERITAS APP                     VERITAS VALIDATOR         PRIMUS
  │                                  │                                 │                      │
  │ requestVerification(rule, agent) │                                 │                      │
  │─────────────────────────────────▶│                                 │                      │
  │                                 │ submitTask()                    │                      │
  │                                 │─────────────────────────────────────────────────────────▶│
  │                                 │                                 │                      │
  │  (returns taskId)               │                                 │                      │
  │◀─────────────────────────────────│                                 │                      │
  │                                 │                                 │                      │
  │                                 │  [Attestation on-chain]         │                      │
  │                                 │                                 │                      │
  │ completeVerification(taskId)    │                                 │                      │
  │─────────────────────────────────▶│                                 │                      │
  │                                 │ validateAndGrant(taskId, ...)   │                      │
  │                                 │────────────────────────────────▶│                      │
  │                                 │                                 │ queryTask(taskId)    │
  │                                 │                                 │─────────────────────▶│
  │                                 │                                 │                      │
  │                                 │                                 │ TaskInfo + Attestation│
  │                                 │                                 │◀─────────────────────│
  │                                 │                                 │                      │
  │                                 │                                 │ ✅ Validate URL      │
  │                                 │                                 │ ✅ Validate recipient│
  │                                 │                                 │ ✅ Validate data key │
  │                                 │                                 │ ✅ Validate freshness│
  │                                 │                                 │                      │
  │                                 │                                 │ Grant reputation     │
  │                                 │ success                         │─────────────────────▶│
  │                                 │◀────────────────────────────────│                      │
  │                                 │                                 │                      │
  │  ✅ Complete                     │                                 │                      │
  │◀─────────────────────────────────│                                 │                      │
  │                                 │                                 │                      │
```

---

## 🔍 Validation Logic

### URL Validation

```solidity
// Direct string comparison (gas-optimized with keccak256)
require(
    keccak256(bytes(att.request[0].url)) == keccak256(bytes(expectedUrl)),
    "URL mismatch"
);
```

**Why not require string == string?**
- Solidity doesn't support direct string comparison
- keccak256 is gas-efficient for string comparison

### Data Key Validation

```solidity
// Check if dataKey exists in attestation data
require(_containsDataKey(att.data, expectedDataKey), "Data key not found");

// Simple implementation (can be enhanced)
function _containsDataKey(string data, string key) pure returns (bool) {
    // Look for "key": pattern in JSON
    bytes memory searchPattern = abi.encodePacks('"', key, '":');
    // ... search in data ...
}
```

**Note**: Data varies per agent (e.g., BTC price $67K for one agent, $68K for another)
- NO hash check - just ensure key exists
- Actual value validated off-chain or with more complex parsing

### Recipient Validation

```solidity
require(att.recipient == tx.origin, "Recipient mismatch");
```

**Why tx.origin?**
- `msg.sender` would be the app contract
- `tx.origin` is the original wallet that initiated the transaction

### Freshness Validation

```solidity
uint256 age = block.timestamp - att.timestamp;
require(age <= maxAge, "Expired");
```

---

## 💡 Example Use Cases

### Use Case 1: BTC Price Verification

```javascript
// Add rule
await app.addRule(
  "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
  "data.rates.USD",  // Just key name, no hash
  100,  // Score
  0,    // Decimals
  3600, // Max age: 1 hour
  "BTC Price Verification"
);

// Agent A verifies (price: $67,234)
const taskId1 = await app.requestVerification(0, agentA);

// Agent B verifies (price: $68,567)
const taskId2 = await app.requestVerification(0, agentB);

// Both valid! Data is different, but key "data.rates.USD" exists
```

### Use Case 2: Social Verification

```javascript
// Twitter followers
await app.addRule(
  "https://api.twitter.com/2/users/me",
  "data.public_metrics.followers_count",
  95,
  0,
  86400,  // Max age: 1 day
  "Twitter Followers"
);

// Each agent has different follower count
// All valid as long as key exists in response
```

---

## 📋 Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Validation Location** | VeritasApp | VeritasValidator |
| **App Responsibilities** | Rules + validation | Rules + orchestration only |
| **Validator Responsibilities** | Reputation only | All validation + reputation |
| **Rule Data Hash** | Required (expectedDataHash) | ❌ Removed (data varies) |
| **Data Key Check** | Hash match | Key existence only |
| **URL Validation** | Hash comparison | Direct string comparison |
| **Data Validation** | Hash match | Key exists (no hash) |

---

## ✅ Benefits of New Design

1. **Clean Separation**: App orchestrates, Validator validates
2. **Flexibility**: Data varies per agent (no hash constraint)
3. **Simpler Rules**: Just URL + dataKey, no complex hash management
4. **Direct Validation**: String comparison more intuitive
5. **Better Testing**: Validate logic isolated in one contract

---

## 🚀 Next Steps

1. **Test deployment** on Base Sepolia
2. **Test data key validation** with different JSON structures
3. **Enhance _containsDataKey** for production (proper JSON parsing)
4. **Add gas optimizations** if needed
5. **Build frontend** for easy rule management

---

## 📝 Implementation Notes

### Data Key Validation

The current `_containsDataKey` implementation is simple:
- Looks for `"key":` pattern in JSON string
- Works for basic JSON structures
- For production, consider:
  - Proper JSON parsing library
  - Off-chain verification with on-chain hash
  - More sophisticated pattern matching

### Recipient Validation

Using `tx.origin` ensures the original wallet initiated the request:
- Works for EOA (Externally Owned Accounts)
- May need adjustment for smart contract wallets
- Consider using EIP-712 signatures for better security

### Gas Optimization

String comparisons use keccak256:
- More gas-efficient than byte-by-byte comparison
- Trade-off: slightly higher gas than storing hashes
- Benefit: more flexible, no pre-computation needed
