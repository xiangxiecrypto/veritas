# Workflow

## Complete Verification Flow

This guide walks through the complete process of registering an agent and building its reputation.

### Prerequisites

- Node.js 18+
- Private key with ETH on Base Sepolia
- Agent metadata (name, description)

### Installation

```bash
npm install ethers @primuslabs/network-core-sdk
```

## Step-by-Step Guide

### Step 1: Register Agent Identity

```javascript
const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';

const identityAbi = [
  "function register(string calldata name, string calldata metadata) external returns (uint256)",
  "function ownerOf(uint256) view returns (address)"
];

const identity = new ethers.Contract(IDENTITY_REGISTRY, identityAbi, wallet);

// Register agent
const tx = await identity.register(
  'My AI Agent',
  JSON.stringify({ description: 'AI assistant for DeFi' })
);

const receipt = await tx.wait();
console.log('Agent registered!');

// Get agentId from event
const agentId = ...; // Extract from Transfer event
console.log('Agent ID:', agentId.toString());
```

### Step 2: Request Verification

```javascript
const APP = '0x0552bD6434D79073d1167BC39d4D01f6c3333F6e';
const FEE = ethers.BigNumber.from('10000000000'); // 0.00000001 ETH

const appAbi = [
  "function requestVerification(uint256 ruleId, uint256 agentId) external payable returns (bytes32)"
];

const app = new ethers.Contract(APP, appAbi, wallet);

// Request verification for BTC/USD (rule 2)
const tx = await app.requestVerification(
  2,      // ruleId: BTC/USD with btcPrice key
  agentId,
  { value: FEE, gasLimit: 500000 }
);

const receipt = await tx.wait();

// Extract taskId from Primus event
const primusLog = receipt.logs.find(l => 
  l.address.toLowerCase() === '0xC02234058caEaA9416506eABf6Ef3122fCA939E8'.toLowerCase()
);

const decoded = ethers.utils.defaultAbiCoder.decode(
  ['bytes32', 'string', 'address[]', 'uint256'],
  primusLog.data
);

const taskId = decoded[0];
console.log('Task ID:', taskId);
console.log('Task URL:', decoded[1]);
```

### Step 3: Attest via SDK

```javascript
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const primus = new PrimusNetwork();
await primus.init(wallet, 84532);

const result = await primus.attest({
  address: wallet.address,
  userAddress: wallet.address,
  taskId: taskId,
  taskTxHash: tx.hash,
  taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
  requests: [{
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    method: 'GET',
    header: '',
    body: ''
  }],
  responseResolves: [[{  // Array of arrays!
    keyName: 'btcPrice',
    parseType: '',
    parsePath: '$.data.rates.USD'
  }]]
}, 60000);

const att = result[0].attestation;
console.log('Attestation data:', att.data);
console.log('Attestation timestamp:', att.timestamp);
```

### Step 4: Submit Attestation

```javascript
const submitAbi = [
  "function submitAttestation(bytes32 taskId, string calldata attestationUrl, string calldata attestationData, uint64 attestationTimestamp) external",
  "function requests(bytes32) view returns (uint256 ruleId, uint256 agentId, address requester, bool completed)"
];

const submitter = new ethers.Contract(APP, submitAbi, wallet);

const tx = await submitter.submitAttestation(
  taskId,
  'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
  att.data,  // '{"btcPrice":"68164.45"}'
  Math.floor(att.timestamp / 1000),  // Convert ms to seconds
  { gasLimit: 500000 }
);

await tx.wait();
console.log('Attestation submitted!');

// Verify completion
const req = await submitter.requests(taskId);
console.log('Completed:', req.completed);
console.log('Agent ID:', req.agentId.toString());
```

### Step 5: Check Reputation

```javascript
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';

// The ReputationRegistry emits FeedbackGiven event
// Check transaction logs for the event

const lastTx = await provider.getTransactionReceipt(tx.hash);
const repLog = lastTx.logs.find(l => 
  l.address.toLowerCase() === REPUTATION_REGISTRY.toLowerCase()
);

if (repLog) {
  // Topic[1] contains agentId
  const agentIdFromEvent = parseInt(repLog.topics[1], 16);
  console.log('Reputation granted to agent:', agentIdFromEvent);
}
```

## Common Patterns

### Batch Verification

```javascript
async function verifyMultipleRules(agentId, ruleIds) {
  const results = [];
  
  for (const ruleId of ruleIds) {
    const result = await verifyAgent(agentId, ruleId);
    results.push(result);
  }
  
  return results;
}

// Verify both BTC and ETH prices
await verifyMultipleRules(674, [2, 3]);
```

### Check Before Requesting

```javascript
async function safeRequest(agentId, ruleId) {
  // Check ownership
  const owner = await identity.ownerOf(agentId);
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error('Not agent owner');
  }
  
  // Check rule is active
  const rule = await app.rules(ruleId);
  if (!rule.active) {
    throw new Error('Rule not active');
  }
  
  // Proceed with request
  return app.requestVerification(ruleId, agentId, { value: FEE });
}
```

### Retry Logic

```javascript
async function attestWithRetry(taskId, txHash, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await primus.attest({ taskId, taskTxHash: txHash, ... }, 60000);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, 5000));  // Wait 5s
    }
  }
}
```

## Troubleshooting

### Issue: "Not agent owner"

**Cause:** Wallet doesn't own the agent NFT

**Solution:**
```javascript
const owner = await identity.ownerOf(agentId);
console.log('Agent owner:', owner);
console.log('Your wallet:', wallet.address);
```

### Issue: "Paying Fee is not correct"

**Cause:** Wrong fee amount

**Solution:**
```javascript
const FEE = ethers.BigNumber.from('10000000000');  // Exactly 10^10 wei
// NOT: ethers.utils.parseEther('0.00000001')  // May have precision issues
```

### Issue: "subArr.map is not a function"

**Cause:** Wrong responseResolves format

**Solution:**
```javascript
// WRONG
responseResolves: [{ keyName: 'btcPrice', ... }]

// CORRECT
responseResolves: [[{ keyName: 'btcPrice', ... }]]
```

### Issue: "Data key not found"

**Cause:** Rule's dataKey doesn't match SDK's keyName

**Solution:**
```javascript
// Rule must have:
dataKey: 'btcPrice'

// SDK must have:
responseResolves: [[{ keyName: 'btcPrice', ... }]]
```

## Transaction Examples

### Successful Verification

| Step | Tx Hash |
|------|---------|
| Request | [0x1f6625bc...](https://sepolia.basescan.org/tx/0x1f6625bc1d7082805b79701a2726d69066cf2f583ccd4b4bda5d04528f732e9a) |
| Submit | [0x8a6741e7...](https://sepolia.basescan.org/tx/0x8a6741e799b5dd04bb6e6945a2f6f15d72041749ca30ac3ea7391d1ee4a159fa) |

**Result:** Agent 674 earned 100 reputation points.

## Best Practices

1. **Verify ownership first** - Check `ownerOf(agentId)`
2. **Use exact fee** - `BigNumber.from('10000000000')`
3. **Match dataKey to keyName** - Rule and SDK must align
4. **Convert timestamps** - SDK ms → contract seconds
5. **Check completed status** - Avoid duplicate processing
6. **Handle timeouts** - SDK may take 30-60 seconds
7. **Log task IDs** - For debugging and tracking
