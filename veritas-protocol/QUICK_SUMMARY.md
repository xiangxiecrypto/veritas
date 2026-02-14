# Veritas App Contract - Quick Summary

## 🎯 What You Asked For

**Your idea**: 
- Single wallet transaction (not two)
- Configurable URL and data checks
- Configurable scores
- Support multiple verification rules
- Flexible ecosystem with multiple app contracts

## ✅ What I Built

### Two New Contracts

#### 1. VeritasApp.sol (Orchestrator)
```solidity
// Define rules
await app.addRule(
  "https://api.coinbase.com/...",
  "btcPrice",      // Data key
  ANY_DATA,        // Expected hash
  100,             // Score
  0,               // Decimals
  3600,            // Max age
  "BTC Price"      // Description
);

// User calls once
await app.requestVerification(ruleId, agentId);
```

**Features**:
- ✅ Multiple configurable rules
- ✅ Each rule has: URL, data key, score, max age
- ✅ Single transaction to start verification
- ✅ Automatic reputation granting

#### 2. VeritasValidator.sol (Generic Validator)
```solidity
// Support multiple app contracts
mapping(address => bool) public authorizedApps;

// Called by apps to validate and grant
function validateAndGrant(
  uint256 agentId,
  bytes32 taskId,
  string url,
  bytes32 dataHash,
  uint256 maxAge,
  int128 score,
  uint8 decimals
) external onlyAuthorizedApp returns (bool);
```

**Features**:
- ✅ Generic validation logic
- ✅ Supports multiple app contracts
- ✅ Community can create new apps
- ✅ Flexible ecosystem

## 🔄 Workflow

### Old Way (2 Transactions)
```
1. Wallet → Submit task
2. Wallet → Validate attestation
```

### New Way (1 Transaction!)
```
1. Wallet → Request verification (includes task submission)
   └─> App contract submits task to Primus automatically
2. Off-chain: Run zkTLS
3. On-chain: Attestation submitted
4. Call: completeVerification (or automated later)
   └─> Validates + grants reputation automatically
```

## 📋 Real Example

```javascript
// 1. Deploy app
const app = await VeritasApp.deploy(primus, validator, reputation);

// 2. Add rules (owner configures)
await app.addRule(
  "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
  "btcPrice",
  ANY_DATA,
  100,  // Score 100 for BTC price
  0,
  3600,
  "BTC/USD"
);

await app.addRule(
  "https://api.twitter.com/...",
  "followerCount",
  ANY_DATA,
  95,   // Score 95 for social proof
  0,
  7200,
  "Twitter Followers"
);

// 3. User verifies (single transaction!)
await app.requestVerification(0, agentId);  // BTC price

// 4. Off-chain zkTLS
await primusSdk.runAttestation(taskId);

// 5. Complete (can be automated)
await app.completeVerification(taskId);
// ✅ Reputation 100 granted automatically!
```

## 🌟 Benefits

| Feature | Before | After |
|---------|--------|-------|
| Transactions | 2 | 1 |
| Rules | Hardcoded | Configurable |
| Use cases | Limited | Unlimited |
| Apps | Single | Multiple |
| Community | No | Yes |

## 📁 Files Created

1. **VeritasApp.sol** - Main orchestration contract
2. **VeritasValidator.sol** - Generic validator
3. **APP_CONTRACT_ARCHITECTURE.md** - Full architecture docs
4. **README_APP.md** - User guide
5. **deploy-app-architecture.js** - Deployment script
6. **example-app-usage.js** - Usage examples

## 🚀 Next Steps

1. **Deploy to Base Sepolia**:
   ```bash
   npx hardhat run scripts/deploy-app-architecture.js --network base-sepolia
   ```

2. **Test the flow**:
   ```bash
   npx hardhat run scripts/example-app-usage.js --network base-sepolia
   ```

3. **Create specialized apps**:
   - PriceFeedsApp
   - SocialProofApp
   - FinancialApp

## 💡 Key Innovation

**Your insight**: Why should the wallet submit twice?

**Solution**: Let the app contract orchestrate everything:
- App knows the rules (URL, score, etc.)
- App submits task to Primus
- App validates results
- App grants reputation

**Result**: Single user transaction, maximum flexibility!

## 🤔 Questions to Consider

1. **Automation**: Should `completeVerification` be automated via Primus callback?
2. **Data extraction**: On-chain JSON parsing or off-chain hash verification?
3. **Governance**: Community voting on rules?
4. **Incentives**: Should app creators get rewards?

Ready to deploy and test? 🚀
