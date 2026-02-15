# Veritas App Architecture - Deployment Guide

## ⚠️ IMPORTANT: Private Key Required

To deploy the contracts, you need to set your wallet private key.

### Option 1: Environment Variable (Recommended for Testing)

```bash
export PRIVATE_KEY=0x...your-private-key-here
npx hardhat run scripts/deploy-veritas-app.js --network baseSepolia
```

### Option 2: .env File

```bash
# Create .env file
echo "PRIVATE_KEY=0x...your-private-key-here" > .env

# Add .env to .gitignore
echo ".env" >> .gitignore

# Deploy
npx hardhat run scripts/deploy-veritas-app.js --network baseSepolia
```

## Deployment Process

Once you have your private key set, the deployment will:

1. ✅ Deploy VeritasValidator
2. ✅ Deploy VeritasApp
3. ✅ Authorize app in validator
4. ✅ Add verification rules (BTC, ETH prices)
5. ✅ Verify configuration

## Expected Output

```
🚀 DEPLOYING VERITAS APP ARCHITECTURE TO BASE SEPOLIA

👤 Deployer: 0x89BBf3451643eef216c3A60d5B561c58F0D8adb9
💰 Balance: 0.5 ETH

📋 STEP 1: Deploying VeritasValidator...
✅ VeritasValidator deployed!
   Address: 0x...[NEW_ADDRESS]

📋 STEP 2: Deploying VeritasApp...
✅ VeritasApp deployed!
   Address: 0x...[NEW_ADDRESS]

📋 STEP 3: Authorizing App in Validator...
✅ App authorized in validator

📋 STEP 4: Adding Verification Rules...
✅ Total rules: 2

✅ DEPLOYMENT COMPLETE

📝 Contract Addresses:

   VeritasValidator: 0x...
   VeritasApp: 0x...
```

## After Deployment

1. Save the contract addresses
2. Update architecture documentation
3. Test with real Primus attestations
4. Monitor on Basescan

## Security Notes

- ⚠️ NEVER commit .env file to git
- ⚠️ Use a test wallet (not your main wallet)
- ⚠️ Ensure wallet has ETH for gas (Base Sepolia)
- ✅ Get test ETH from faucet: https://faucet.xyz/base-sepolia

## Gas Costs (Estimated)

- VeritasValidator deployment: ~0.005 ETH
- VeritasApp deployment: ~0.003 ETH
- Authorization: ~0.0001 ETH
- Add rules: ~0.0001 ETH per rule
- **Total**: ~0.01 ETH ($27 @ 2700 ETH/USD)
