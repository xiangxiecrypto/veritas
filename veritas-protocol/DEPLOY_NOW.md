# 🚀 Veritas App Deployment

## Quick Deploy

```bash
# Set your private key (TEST WALLET ONLY!)
export PRIVATE_KEY=0x89BBf3451643eef216c3A60d5B561c58F0D8adb9...  # Your key

# Deploy to Base Sepolia
npx hardhat run scripts/deploy-veritas-app.js --network baseSepolia
```

## What Will Be Deployed

### 1. VeritasValidator
- **Purpose**: Generic validator for all app contracts
- **Features**: 
  - URL hash comparison (50% gas savings)
  - Data key validation
  - Freshness checks
  - Reputation granting

### 2. VeritasApp  
- **Purpose**: Orchestration contract
- **Features**:
  - Configurable rules (URL, dataKey, score, maxAge)
  - Hash pre-computation (gas optimized)
  - Task submission to Primus
  - Validation coordination

### 3. Verification Rules (Auto-deployed)
- **Rule 0**: BTC Price (score: 100, maxAge: 1hr)
- **Rule 1**: ETH Price (score: 95, maxAge: 2hrs)

## Expected Deployment

```
Deployer: 0x89BBf3451643eef216c3A60d5B561c58F0D8adb9

✅ VeritasValidator: 0x...[NEW]
✅ VeritasApp: 0x...[NEW]
✅ App Authorized
✅ Rules Added: 2

Gas Cost: ~0.01 ETH
```

## Test After Deployment

```bash
# Test requestVerification
npx hardhat run scripts/test-request-verification.js --network baseSepolia

# Test completeVerification  
npx hardhat run scripts/test-complete-verification.js --network baseSepolia
```

## View on Basescan

After deployment, you'll get links like:
- Validator: https://sepolia.basescan.org/address/0x...
- App: https://sepolia.basescan.org/address/0x...

---

**Status**: Ready to deploy - just set PRIVATE_KEY and run the script!
