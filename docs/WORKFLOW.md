# Veritas Workflow

## Complete Validation Workflow

This document describes the step-by-step process for validating API data with Veritas.

## Prerequisites

1. **Ethereum Wallet** - With Base Sepolia ETH for gas
2. **Primus SDK** - Installed via npm
3. **VeritasSDK** - Installed in your project

```bash
npm install @primuslabs/network-core-sdk
```

## Step 1: Setup

### Initialize SDK

```javascript
const { VeritasSDK } = require('./sdk');
const { ethers } = require('ethers');

// Connect to Base Sepolia
const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Initialize Veritas SDK
const sdk = new VeritasSDK();
await sdk.init(wallet);
```

## Step 2: Register Agent

Every agent needs an on-chain identity:

```javascript
// Register new agent (auto-assigns ID)
const result = await sdk.registerAgent();
console.log('Agent ID:', result.agentId);
console.log('Transaction:', result.txHash);

// Output:
// Agent ID: 1184
// Transaction: 0x123abc...
```

## Step 3: Build Validation Request

### For Public APIs (No Authentication)

```javascript
// Example: Coinbase BTC price
const request = VeritasSDK.createRequest(
  'https://api.coinbase.com/v2/exchange-rates?currency=BTC'
);

const responseResolves = VeritasSDK.createResponseResolve(
  'btcPrice',              // keyName (any name you want)
  '$.data.rates.USD'       // JSONPath to extract
);
```

### For Protected APIs (With Authentication)

```javascript
// Example: Moltbook karma (requires API key)
const request = VeritasSDK.createRequest(
  'https://www.moltbook.com/api/v1/agents/me',
  {
    header: {
      'Authorization': `Bearer ${process.env.MOLTBOOK_API_KEY}`
    }
  }
);

const responseResolves = VeritasSDK.createResponseResolve(
  'karma',
  '$.agent.karma'
);
```

## Step 4: Run Validation

```javascript
const result = await sdk.validate({
  agentId: 1184,           // Your agent ID
  ruleId: 0,               // Rule to use (0 = BTC, 1 = Moltbook)
  checkIds: [0],           // Checks to run
  request: request,
  responseResolves: responseResolves
});

console.log('Success:', result.success);
console.log('Score:', result.score);
console.log('Callback Tx:', result.callbackTxHash);
```

## Step 5: Verify Results

### On-Chain Verification

```javascript
// Check agent reputation
const info = await sdk.getAgentInfo(1184);
console.log('Validations:', info.validationCount);
console.log('Owner:', info.owner);

// View transaction on explorer
console.log(`https://sepolia.basescan.org/tx/${result.callbackTxHash}`);
```

### Events Emitted

```solidity
event ValidationRequested(
    bytes32 indexed taskId,
    uint256 indexed ruleId,
    uint256 indexed agentId
);

event CheckPassed(
    uint256 indexed ruleId,
    uint256 indexed checkId,
    int128 score
);

event ValidationCompleted(
    bytes32 indexed taskId,
    uint8 score
);
```

## Complete Example: BTC Price Validation

```javascript
const { VeritasSDK } = require('./sdk');
const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  // 1. Initialize SDK
  const sdk = new VeritasSDK();
  await sdk.init(signer);
  
  // 2. Register agent
  const { agentId } = await sdk.registerAgent();
  console.log('✅ Agent registered:', agentId);
  
  // 3. Build request
  const request = VeritasSDK.createRequest(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC'
  );
  
  const responseResolves = VeritasSDK.createResponseResolve(
    'btcPrice',
    '$.data.rates.USD'
  );
  
  // 4. Run validation
  const result = await sdk.validate({
    agentId,
    ruleId: 0,
    checkIds: [0],
    request,
    responseResolves
  });
  
  // 5. Verify
  console.log('✅ Validation complete!');
  console.log('   Score:', result.score);
  console.log('   Tx:', result.callbackTxHash);
  
  // Extract BTC price from attestation
  const match = result.data?.match(/"btcPrice":"([^"]+)"/);
  const btcPrice = match ? match[1] : 'N/A';
  console.log('   BTC Price: $' + btcPrice);
}

main();
```

## Output Example

```
✅ Agent registered: 1184
✅ Validation complete!
   Score: 90
   Tx: 0xabc123...
   BTC Price: $95234.56

Events:
  ValidationRequested(taskId=0x..., ruleId=0, agentId=1184)
  CheckPassed(ruleId=0, checkId=0, score=90)
  ValidationCompleted(taskId=0x..., score=100)
```

## Time Estimates

| Step | Time |
|------|------|
| Register Agent | ~3 seconds |
| Build Request | Instant |
| Run Validation | ~30-60 seconds |
| Verify Results | Instant |

## Troubleshooting

### "Agent not registered"
```
Solution: Run registerAgent() first
```

### "Rule not found"
```
Solution: Check ruleId (0 = BTC, 1 = Moltbook)
Run setup-rules.js if rules not configured
```

### "Check failed"
```
Solution: Check checkIds array
Ensure check contract is deployed
```

### "Attestation timeout"
```
Solution: Primus attestation can take 30-60 seconds
Wait for callback transaction
```

## Gas Costs (Base Sepolia)

| Operation | Gas | Cost (ETH) |
|-----------|-----|------------|
| Register Agent | ~50,000 | ~0.0001 |
| Request Validation | ~100,000 | ~0.0002 |
| Callback (auto) | ~900,000 | ~0.0018 |

## Next Steps

1. **Create Custom Rules** - Define your own API endpoints
2. **Create Custom Checks** - Add validation logic
3. **Build Reputation** - Run multiple validations
4. **Integrate** - Use in your AI agent system
