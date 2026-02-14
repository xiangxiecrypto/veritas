# Veritas App Contract Architecture

## 🎯 Problem

Current workflow requires **2 wallet submissions**:
1. Wallet → Primus: Submit task
2. Wallet → Veritas: Validate attestation

## 💡 Solution: App Contract Orchestration

Create an **App Contract** that orchestrates the entire flow:

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE WALLET TX                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   VeritasApp Contract   │
              │  (Rules + Orchestration)│
              │                         │
              │  • Define verification  │
              │    rules (URL, score)   │
              │  • Initiate zkTLS task  │
              │  • Validate results     │
              │  • Grant reputation     │
              └────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Primus  │    │ Veritas  │    │Reputation│
    │ TaskContr│    │Validator │    │ Registry │
    └──────────┘    └──────────┘    └──────────┘
```

## 🏗️ Architecture

### 1. VeritasApp (New)

**Purpose**: Define rules + orchestrate verification

```solidity
contract VeritasApp {
    struct VerificationRule {
        string url;              // e.g., "https://api.coinbase.com/..."
        string dataKey;          // e.g., "btcPrice"
        bytes32 expectedDataHash;// Hash of expected data (or 0 for any)
        int128 reputationScore;  // Score to grant (e.g., 95)
        uint256 maxAgeSeconds;   // Freshness (e.g., 3600 = 1 hour)
        bool active;
    }

    mapping(uint256 => VerificationRule) public rules;
    uint256 public ruleCount;

    // Add verification rule
    function addRule(
        string calldata url,
        string calldata dataKey,
        bytes32 expectedDataHash,
        int128 reputationScore,
        uint256 maxAgeSeconds
    ) external onlyOwner returns (uint256 ruleId);

    // Wallet calls this ONCE
    function requestVerification(
        uint256 ruleId,
        uint256 agentId
    ) external returns (bytes32 taskId);

    // Called after attestation is on-chain
    function verifyAndGrant(
        uint256 ruleId,
        bytes32 taskId,
        uint256 agentId
    ) external returns (bool);
}
```

### 2. VeritasValidator (Enhanced)

**Purpose**: Generic validation (supports multiple app contracts)

```solidity
contract VeritasValidator {
    // Allow multiple app contracts
    mapping(address => bool) public authorizedApps;

    // Validate for any app contract
    function validateAttestation(
        uint256 agentId,
        bytes32 taskId,
        address appContract,
        bytes calldata appData
    ) external returns (bool);
}
```

## 🔄 Workflow

### Step 1: Setup (One-time)

```javascript
// Deploy app contract
const app = await VeritasApp.deploy(validator.address);

// Add verification rules
await app.addRule(
  "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
  "btcPrice",
  ethers.constants.HashZero,  // Any data
  100,  // Score
  3600  // Max age: 1 hour
);

await app.addRule(
  "https://api.twitter.com/...",
  "followerCount",
  ethers.constants.HashZero,
  95,
  7200  // 2 hours
);
```

### Step 2: Wallet Verification (Single TX!)

```javascript
// Wallet calls app contract
const tx = await app.requestVerification(
  0,  // ruleId (BTC price)
  1   // agentId
);

// Wait for task to be created
const receipt = await tx.wait();
const taskId = extractTaskId(receipt);

// Off-chain: Run zkTLS with attestor
await primusSdk.runAttestation(taskId);

// On-chain: Attestation submitted automatically by Primus
// On-chain: App contract verifies and grants reputation
```

### Step 3: Automatic Verification

```solidity
// Inside VeritasApp
function verifyAndGrant(uint256 ruleId, bytes32 taskId, uint256 agentId) 
    external 
    returns (bool) 
{
    // 1. Get rule
    VerificationRule memory rule = rules[ruleId];
    require(rule.active, "Rule inactive");

    // 2. Fetch attestation from Primus
    TaskInfo memory taskInfo = primusTask.queryTask(taskId);
    Attestation memory att = taskInfo.taskResults[0].attestation;

    // 3. Verify URL matches
    require(
        keccak256(bytes(att.request[0].url)) == keccak256(bytes(rule.url)),
        "URL mismatch"
    );

    // 4. Verify data key exists
    require(
        extractDataKey(att.data, rule.dataKey),
        "Data key not found"
    );

    // 5. Verify data hash (if specified)
    if (rule.expectedDataHash != bytes32(0)) {
        require(
            keccak256(bytes(att.data)) == rule.expectedDataHash,
            "Data mismatch"
        );
    }

    // 6. Verify freshness
    uint256 age = block.timestamp - att.timestamp;
    require(age <= rule.maxAgeSeconds, "Expired");

    // 7. Grant reputation
    reputation.giveFeedback(
        agentId,
        rule.reputationScore,
        0,
        "veritas-app",
        rule.url,
        rule.url,
        att.data,
        taskId
    );

    return true;
}
```

## 🌟 Benefits

### 1. Single Wallet Transaction
- **Before**: 2 transactions (submit task, validate)
- **After**: 1 transaction (request verification)

### 2. Flexible Rules
```javascript
// Rule 1: BTC price, score 100, fresh 1 hour
await app.addRule(btcUrl, "price", ANY, 100, 3600);

// Rule 2: Twitter followers, score 95, fresh 2 hours
await app.addRule(twitterUrl, "followers", ANY, 95, 7200);

// Rule 3: Bank balance > $1000, score 98, fresh 1 day
await app.addRule(bankUrl, "balance", specificHash, 98, 86400);
```

### 3. Multiple App Contracts
```javascript
// Anyone can deploy app contracts
const btcApp = await VeritasApp.deploy(...);
const twitterApp = await VeritasApp.deploy(...);
const bankApp = await VeritasApp.deploy(...);

// Validator supports all of them
await validator.authorizeApp(btcApp.address);
await validator.authorizeApp(twitterApp.address);
await validator.authorizeApp(bankApp.address);
```

### 4. Community Ecosystem
- Developers create specialized app contracts
- Users choose which apps to trust
- Reputation accumulates from multiple sources

## 📊 Example Use Cases

### Use Case 1: Price Oracle

```solidity
// Deploy BTC price app
VeritasApp btcPriceApp = new VeritasApp(validator);

btcPriceApp.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    "data.rates.USD",
    ANY,
    100,
    1 hours
);

// User verifies BTC price
btcPriceApp.requestVerification(0, agentId);
```

### Use Case 2: Social Verification

```solidity
// Deploy social verification app
VeritasApp socialApp = new VeritasApp(validator);

socialApp.addRule(
    "https://api.twitter.com/2/users/me",
    "data.public_metrics.followers_count",
    ANY,
    95,
    24 hours
);

// User verifies follower count
socialApp.requestVerification(0, agentId);
```

### Use Case 3: Financial Proof

```solidity
// Deploy financial verification app
VeritasApp financeApp = new VeritasApp(validator);

financeApp.addRule(
    "https://api.bank.com/balance",
    "accounts[0].balance",
    hashOfExpectedBalance,
    98,
    7 days
);

// User proves account balance
financeApp.requestVerification(0, agentId);
```

## 🔧 Contract Naming Options

1. **VeritasApp** - Simple, consistent with protocol name
2. **TrustRegistry** - Emphasizes reputation building
3. **VerificationApp** - Descriptive
4. **AttestationOrchestrator** - Technical
5. **RuleEngine** - Emphasizes rule-based logic

**Recommendation**: `VeritasApp` (simple, memorable)

## 🚀 Implementation Plan

### Phase 1: Core Contracts
1. ✅ VeritasValidator (generic validator)
2. ⏭️ VeritasApp (rule engine + orchestration)
3. ⏭️ Integration with Primus TaskContract

### Phase 2: Features
1. Multiple rules per app
2. Data key extraction
3. Batch verification
4. Rule templates

### Phase 3: Ecosystem
1. App contract factory
2. App registry
3. Reputation aggregator
4. Developer tools

## 🎯 Key Design Decisions

### Decision 1: Who Calls verifyAndGrant?

**Option A**: Wallet calls after attestation is on-chain
- Pro: Simple
- Con: Still requires second transaction

**Option B**: Primus callback triggers verification
- Pro: Fully automated
- Con: Requires Primus integration

**Option C**: Relayer/keeper network
- Pro: Automated, decentralized
- Con: Additional infrastructure

**Recommendation**: Start with Option A, migrate to Option B/C later

### Decision 2: Data Key Extraction

**On-chain parsing**:
```solidity
function extractDataKey(string memory data, string memory key) 
    pure 
    returns (bool, bytes memory) 
{
    // Parse JSON, extract key
    // Complex but transparent
}
```

**Off-chain verification**:
```solidity
function verifyAndGrant(
    uint256 ruleId,
    bytes32 taskId,
    bytes32 dataHash  // Calculated off-chain
) {
    require(keccak256(att.data) == dataHash);
}
```

**Recommendation**: Off-chain verification for simplicity

### Decision 3: Rule Flexibility

**Fixed rules** (deployer sets, immutable):
- Simpler
- More secure
- Less flexible

**Mutable rules** (owner can update):
- More flexible
- Requires trust
- Governance needed

**Recommendation**: Mutable rules with time-locked updates

## 📝 Next Steps

1. Design detailed contract interfaces
2. Implement VeritasApp.sol
3. Enhance VeritasValidator.sol for app support
4. Create deployment scripts
5. Build example apps (price, social, financial)
6. Test end-to-end flow
7. Document developer guide

Ready to implement? Let's build this! 🚀
