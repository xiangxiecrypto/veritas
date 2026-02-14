# Veritas App Contract Architecture

## 🎯 The Problem

Current Veritas workflow requires **2 wallet transactions**:
1. Wallet → Submit task to Primus
2. Wallet → Validate attestation

This is:
- ❌ Not user-friendly
- ❌ Extra gas costs
- ❌ Complex integration

## 💡 The Solution

**VeritasApp** - Single transaction orchestration:

```
Single TX → zkTLS off-chain → Automatic verification → Reputation granted
```

## 🏗️ Architecture

### Two New Contracts

#### 1. VeritasApp

**Purpose**: Orchestrate verification with configurable rules

```solidity
contract VeritasApp {
    // Define verification rules
    struct VerificationRule {
        string url;               // What URL to verify
        string dataKey;           // What data to extract
        bytes32 expectedDataHash; // Expected data (or any)
        int128 reputationScore;   // Score to grant
        uint256 maxAgeSeconds;    // Freshness requirement
        bool active;
        string description;
    }
    
    // User calls this ONCE
    function requestVerification(
        uint256 ruleId,
        uint256 agentId
    ) external returns (bytes32 taskId);
    
    // Complete verification (can be automated)
    function completeVerification(bytes32 taskId) external returns (bool);
}
```

#### 2. VeritasValidator

**Purpose**: Generic validation supporting multiple app contracts

```solidity
contract VeritasValidator {
    // Authorize multiple app contracts
    mapping(address => bool) public authorizedApps;
    
    // Validate and grant reputation
    function validateAndGrant(
        uint256 agentId,
        bytes32 taskId,
        string calldata expectedUrl,
        bytes32 expectedDataHash,
        uint256 maxAge,
        int128 score,
        uint8 scoreDecimals
    ) external onlyAuthorizedApp returns (bool);
}
```

## 🔄 Workflow

### Before (2 Transactions)

```javascript
// Transaction 1: Submit task
const taskId = await primus.submitTask(...);

// Off-chain: Run zkTLS
await primusSdk.runAttestation(taskId);

// Transaction 2: Validate
await veritas.validateAttestation(agentId, taskId, ...);
```

### After (1 Transaction!)

```javascript
// Transaction 1: Request verification
const taskId = await app.requestVerification(ruleId, agentId);

// Off-chain: Run zkTLS
await primusSdk.runAttestation(taskId);

// Automatic: App contract verifies and grants reputation
// (Or manual call: await app.completeVerification(taskId);)
```

## 📋 Example Use Cases

### Use Case 1: Price Verification

```javascript
// Setup (one-time)
await app.addRule(
  "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
  "data.rates.USD",
  ANY_DATA,
  100,  // Score
  0,    // Decimals
  3600, // Max age: 1 hour
  "BTC/USD Price"
);

// User verification
await app.requestVerification(0, agentId);
```

### Use Case 2: Social Proof

```javascript
await app.addRule(
  "https://api.twitter.com/2/users/me",
  "data.public_metrics.followers_count",
  ANY_DATA,
  95,
  0,
  86400, // Max age: 1 day
  "Twitter Followers"
);

await app.requestVerification(1, agentId);
```

### Use Case 3: Financial Proof

```javascript
await app.addRule(
  "https://api.bank.com/balance",
  "accounts[0].balance",
  SPECIFIC_HASH, // Must match specific balance
  98,
  0,
  604800, // Max age: 1 week
  "Bank Balance > $1000"
);

await app.requestVerification(2, agentId);
```

## 🌟 Key Benefits

### 1. Single Transaction
- **Before**: 2 transactions (submit + validate)
- **After**: 1 transaction (request)

### 2. Configurable Rules
```javascript
// Add as many rules as needed
await app.addRule(url1, key1, hash1, score1, dec1, age1, desc1);
await app.addRule(url2, key2, hash2, score2, dec2, age2, desc2);
await app.addRule(url3, key3, hash3, score3, dec3, age3, desc3);
```

### 3. Multiple App Contracts
```javascript
// Anyone can deploy specialized apps
const btcPriceApp = await VeritasApp.deploy(...);
const socialApp = await VeritasApp.deploy(...);
const financeApp = await VeritasApp.deploy(...);

// Validator supports all of them
await validator.setAppAuthorization(btcPriceApp.address, true);
await validator.setAppAuthorization(socialApp.address, true);
await validator.setAppAuthorization(financeApp.address, true);
```

### 4. Community Ecosystem
- Developers create specialized apps
- Users choose which apps to use
- Reputation accumulates from multiple sources
- Flexible and extensible

## 🚀 Quick Start

### Deploy

```bash
npx hardhat run scripts/deploy-app-architecture.js --network base-sepolia
```

### Add Rules

```javascript
// Add BTC price rule
await app.addRule(
  "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
  "data.rates.USD",
  ethers.constants.HashZero,
  100,
  0,
  3600,
  "BTC/USD Price"
);
```

### Use

```javascript
// User verifies price (single transaction!)
await app.requestVerification(0, agentId);

// Reputation automatically granted
```

## 📊 Comparison

| Feature | Old (Validator Only) | New (App + Validator) |
|---------|---------------------|----------------------|
| Wallet TXs | 2 | 1 |
| Configuration | Hardcoded | Configurable rules |
| Use Cases | Limited | Unlimited |
| Extensibility | Low | High |
| Community | No | Yes (multiple apps) |
| Complexity | Low | Medium |
| Flexibility | Low | High |

## 🔮 Future Enhancements

### Phase 1 (Current)
- ✅ VeritasApp contract
- ✅ VeritasValidator with multi-app support
- ✅ Configurable rules
- ⏭️ Testing and deployment

### Phase 2
- ⏭️ Automated verification (Primus callback)
- ⏭️ Batch verification
- ⏭️ Rule templates
- ⏭️ Data key extraction on-chain

### Phase 3
- ⏭️ App factory
- ⏭️ App registry
- ⏭️ Reputation aggregator
- ⏭️ Developer tools

## 💡 Design Decisions

### Decision 1: Two-Contract Architecture

**Why separate App and Validator?**

- **Separation of concerns**: Rules vs validation logic
- **Flexibility**: Multiple apps, one validator
- **Upgradability**: Apps can be upgraded independently
- **Community**: Anyone can deploy apps

### Decision 2: Rule-Based System

**Why rules instead of hardcoded?**

- **Flexibility**: Support unlimited use cases
- **Configurability**: Change scores, freshness without upgrading
- **Transparency**: Rules visible on-chain
- **Governance**: Could add community voting on rules

### Decision 3: Manual CompleteVerification

**Why not fully automated?**

- **Simplicity**: Start simple, add complexity later
- **Primus integration**: Requires callback support
- **Relayers**: Could add keeper network later
- **User control**: Users choose when to complete

Future: Add Primus callback → Fully automated!

## 📖 Documentation

- [Architecture Guide](./docs/APP_CONTRACT_ARCHITECTURE.md)
- [Deployment Script](./scripts/deploy-app-architecture.js)
- [Usage Example](./scripts/example-app-usage.js)

## 🤝 Contributing

Ideas for specialized app contracts:
- **PriceFeedsApp**: Cryptocurrency prices, forex, stocks
- **SocialProofApp**: Twitter, LinkedIn, GitHub metrics
- **FinancialApp**: Bank balances, credit scores
- **IdentityApp**: KYC verification, document proofs
- **ReputationApp**: Platform ratings, reviews

Create your own and contribute!

## 📄 License

MIT

---

Built with ❤️ by the Primus community
