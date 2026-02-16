# V3 Design: Custom Checks in ValidationRegistry

## Overview

Move all validation logic (including custom checks) into `VeritasValidationRegistryV3`. The App contract becomes simpler - just manages rules and submits requests.

## Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERITAS PROTOCOL V3                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. PrimusVeritasAppV3 (Simple)                                     │
│     - Manages rules (URL + dataKey)                                 │
│     - Receives verification requests                                │
│     - Calls Primus for attestation                                  │
│     - Calls ValidationRegistry.validate()                           │
│     - NO custom check logic here                                    │
│                                                                     │
│  2. VeritasValidationRegistryV3 (All Validation)                    │
│     - Basic validation (URL hash, data key, freshness)              │
│     - Custom checks per rule                                        │
│     - Each check has: type + params + score                         │
│     - Runs all checks and sums scores                               │
│     - Calls ReputationRegistry to grant reputation                  │
│                                                                     │
│  3. ReputationRegistry (ERC-8004)                                   │
│     - Stores reputation scores per agent                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Structures

### In ValidationRegistryV3

```solidity
// Check types
enum CheckType {
    NONE,           // No check
    MIN_THRESHOLD,  // value >= minValue
    MAX_THRESHOLD,  // value <= maxValue
    RANGE,          // minValue <= value <= maxValue
    EXACT_MATCH,    // value == exactValue
    CONTAINS        // data contains substring
}

// Custom check definition
struct CustomCheck {
    CheckType checkType;
    int128 minValue;      // For MIN_THRESHOLD, RANGE
    int128 maxValue;      // For MAX_THRESHOLD, RANGE  
    int128 exactValue;    // For EXACT_MATCH
    string containsStr;   // For CONTAINS
    int128 score;         // Score if check passes
    bool active;
    string description;
}

// Rule validation config
struct RuleValidation {
    bytes32 urlHash;
    string dataKey;
    uint8 decimals;
    uint256 maxAge;
    bool active;
    // Custom checks for this rule
    mapping(uint256 => CustomCheck) checks;
    uint256 checkCount;
}
```

## Workflow

```
STEP 1: ADD RULE (Admin → App)
─────────────────────────────
Admin → App.addRule(url, dataKey, decimals, maxAge)
       → App stores rule
       → App calls ValidationRegistry.registerRule(ruleId, urlHash, dataKey, ...)


STEP 2: ADD CUSTOM CHECKS (Admin → ValidationRegistry)
──────────────────────────────────────────────────────
Admin → ValidationRegistry.addCheck(
            ruleId,
            checkType: RANGE,
            minValue: 50000,
            maxValue: 100000,
            score: 100
        )


STEP 3: REQUEST VERIFICATION (Agent → App)
──────────────────────────────────────────
Agent → App.requestVerification(ruleId, agentId, checkIds)
      → App calls Primus.submitTask()
      → App stores request with checkIds


STEP 4: SUBMIT ATTESTATION (Anyone → App)
─────────────────────────────────────────
Anyone → App.submitAttestation(taskId, url, data, timestamp)
       → App verifies Primus attestation
       → App calls ValidationRegistry.validateAttestation(
              ruleId, agentId, checkIds, url, data, timestamp
          )


STEP 5: VALIDATE (ValidationRegistry)
─────────────────────────────────────
ValidationRegistry.validateAttestation(params):
       → Basic checks:
          - URL hash matches
          - Data key exists
          - Timestamp fresh
       
       → FOR EACH checkId:
          - Extract value from data
          - Apply check (e.g., RANGE: 50000 <= value <= 100000)
          - If passed: totalScore += check.score
          - Emit CheckPassed/Failed event
       
       → Grant reputation: giveFeedback(agentId, totalScore)


STEP 6: GRANT REPUTATION
────────────────────────
ReputationRegistry.giveFeedback(agentId, totalScore, ...)
```

## Contract Interfaces

### PrimusVeritasAppV3 (Simplified)

```solidity
contract PrimusVeritasAppV3 {
    struct VerificationRule {
        string url;
        string dataKey;
        uint8 decimals;
        uint256 maxAge;
        bool active;
        string description;
    }
    
    // Just manages rules, no validation logic
    function addRule(...) external onlyOwner;
    
    // Request with check IDs
    function requestVerification(
        uint256 ruleId,
        uint256 agentId,
        uint256[] calldata checkIds
    ) external payable returns (bytes32 taskId);
    
    // Submit attestation
    function submitAttestation(
        bytes32 taskId,
        string calldata url,
        string calldata data,
        uint64 timestamp
    ) external {
        // Verify Primus attestation
        // Call ValidationRegistry.validateAttestation()
    }
}
```

### VeritasValidationRegistryV3

```solidity
contract VeritasValidationRegistryV3 {
    // Rule validation config
    mapping(uint256 => RuleValidation) public rules;
    
    // Add rule validation config
    function registerRule(
        uint256 ruleId,
        bytes32 urlHash,
        string calldata dataKey,
        uint8 decimals,
        uint256 maxAge
    ) external;
    
    // Add custom check to rule
    function addCheck(
        uint256 ruleId,
        CheckType checkType,
        int128 minValue,
        int128 maxValue,
        int128 exactValue,
        string calldata containsStr,
        int128 score,
        string calldata description
    ) external onlyOwner returns (uint256 checkId);
    
    // Main validation function
    function validateAttestation(ValidationParams calldata params) external returns (bool) {
        // Basic validation
        // Run custom checks
        // Grant reputation
    }
    
    // Internal: run a single check
    function _runCheck(
        CustomCheck storage check,
        int128 value,
        string calldata data
    ) internal view returns (bool passed);
}
```

## Example Usage

```javascript
// 1. Add rule in App
await app.addRule(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    'btcPrice',
    2, 3600, 'BTC/USD'
);

// 2. Add custom checks in ValidationRegistry
await registry.addCheck(0, CheckType.RANGE, 50000, 100000, 0, '', 100, 'Price 50k-100k');
await registry.addCheck(0, CheckType.MIN_THRESHOLD, 60000, 0, 0, '', 50, 'Price > 60k');

// 3. Agent requests verification
await app.requestVerification(0, agentId, [0, 1]);  // Prove both checks

// 4. Attestation + submit
// ... SDK.attest() ...
await app.submitAttestation(taskId, url, data, timestamp);

// 5. ValidationRegistry runs checks:
//    - Check 0: 68164 in [50000, 100000]? YES → +100
//    - Check 1: 68164 >= 60000? YES → +50
//    - Total: 150 points granted
```

---

## Benefits

1. **Single validation point** - All validation in ValidationRegistry
2. **Simpler App** - App just manages rules and submits
3. **Flexible checks** - Multiple check types, easy to extend
4. **Gas efficient** - Checks run in same contract as validation

---

Should I implement this design? The App becomes very simple, and ValidationRegistry handles everything.
