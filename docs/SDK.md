# SDK Reference

## Installation

```bash
npm install ethers @primuslabs/network-core-sdk
```

## Quick Start

```javascript
const { ethers } = require('ethers');
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

// Setup
const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize Primus SDK
const primus = new PrimusNetwork();
await primus.init(wallet, 84532);  // Base Sepolia
```

## PrimusVeritasAppV2 Contract

### Address
```
Base Sepolia: 0x0552bD6434D79073d1167BC39d4D01f6c3333F6e
```

### ABI (Key Functions)

```javascript
const APP_ABI = [
  // Request verification
  "function requestVerification(uint256 ruleId, uint256 agentId) external payable returns (bytes32 taskId)",
  
  // Submit attestation
  "function submitAttestation(bytes32 taskId, string calldata attestationUrl, string calldata attestationData, uint64 attestationTimestamp) external",
  
  // Get request status
  "function requests(bytes32) view returns (uint256 ruleId, uint256 agentId, address requester, bool completed)",
  
  // Get rules
  "function rules(uint256) view returns (bytes32 urlHash, string url, string dataKey, int128 score, uint8 decimals, uint256 maxAge, bool active, string description)",
  
  // Events
  "event VerificationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId)",
  "event VerificationCompleted(bytes32 indexed taskId, uint256 indexed agentId, int128 score)"
];
```

## Methods

### requestVerification()

Request verification for an agent.

```javascript
const FEE = ethers.BigNumber.from('10000000000'); // 0.00000001 ETH

const tx = await app.requestVerification(
  2,    // ruleId (BTC/USD with btcPrice key)
  674,  // agentId
  { value: FEE, gasLimit: 500000 }
);

const receipt = await tx.wait();
const taskId = extractTaskIdFromLogs(receipt);
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| ruleId | uint256 | Rule to verify against |
| agentId | uint256 | Agent to credit reputation to |
| value | uint256 | Must be exactly 10^10 wei |

**Returns:** `bytes32 taskId`

### SDK.attest()

Perform zkTLS attestation off-chain.

```javascript
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
  responseResolves: [[{  // ⚠️ Must be array of arrays!
    keyName: 'btcPrice',
    parseType: '',
    parsePath: '$.data.rates.USD'
  }]]
}, 60000);  // 60 second timeout
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| taskId | bytes32 | From requestVerification() |
| taskTxHash | string | Transaction hash |
| taskAttestors | address[] | Primus attestor addresses |
| requests | array | HTTP request details |
| responseResolves | array[][] | ⚠️ Array of arrays! |
| timeout | number | Milliseconds |

**Returns:**
```javascript
[{
  attestation: {
    recipient: address,
    request: [{ url, method, header, body }],
    data: '{"btcPrice":"68164.45"}',
    timestamp: 1771212303269  // milliseconds
  },
  attestor: address,
  signature: bytes,
  reportTxHash: bytes32
}]
```

### submitAttestation()

Submit attestation to contract for validation and reputation grant.

```javascript
const att = result[0].attestation;

const tx = await app.submitAttestation(
  taskId,
  'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
  att.data,  // '{"btcPrice":"68164.45"}'
  Math.floor(att.timestamp / 1000),  // Convert to seconds!
  { gasLimit: 500000 }
);

await tx.wait();
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| taskId | bytes32 | Task to complete |
| attestationUrl | string | Must match task's templateId |
| attestationData | string | JSON data from attestation |
| attestationTimestamp | uint64 | ⚠️ In seconds, not ms |

## Complete Example

```javascript
const { ethers } = require('ethers');
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

async function verifyAgent(agentId, ruleId) {
  // Setup
  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const APP = '0x0552bD6434D79073d1167BC39d4D01f6c3333F6e';
  const FEE = ethers.BigNumber.from('10000000000');
  
  const app = new ethers.Contract(APP, APP_ABI, wallet);
  
  // Step 1: Request verification
  console.log('Requesting verification...');
  const tx1 = await app.requestVerification(ruleId, agentId, { 
    value: FEE, 
    gasLimit: 500000 
  });
  const receipt1 = await tx1.wait();
  
  // Extract taskId from Primus event
  const taskId = ethers.utils.defaultAbiCoder.decode(
    ['bytes32', 'string', 'address[]', 'uint256'],
    receipt1.logs[0].data
  )[0];
  console.log('Task ID:', taskId);
  
  // Step 2: Attest via SDK
  console.log('Attesting...');
  const primus = new PrimusNetwork();
  await primus.init(wallet, 84532);
  
  const result = await primus.attest({
    address: wallet.address,
    userAddress: wallet.address,
    taskId,
    taskTxHash: tx1.hash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
      method: 'GET', header: '', body: ''
    }],
    responseResolves: [[{
      keyName: 'btcPrice',
      parseType: '',
      parsePath: '$.data.rates.USD'
    }]]
  }, 60000);
  
  const att = result[0].attestation;
  console.log('Attestation:', att.data);
  
  // Step 3: Submit attestation
  console.log('Submitting attestation...');
  const tx2 = await app.submitAttestation(
    taskId,
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    att.data,
    Math.floor(att.timestamp / 1000),
    { gasLimit: 500000 }
  );
  await tx2.wait();
  
  // Verify
  const req = await app.requests(taskId);
  if (req.completed) {
    console.log('✅ Reputation granted to agent', agentId);
  }
  
  return { taskId, completed: req.completed };
}

verifyAgent(674, 2).catch(console.error);
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Paying Fee is not correct` | Wrong fee amount | Use exactly 10^10 wei |
| `Not agent owner` | Caller doesn't own agent | Check IdentityRegistry.ownerOf() |
| `subArr.map is not a function` | Wrong responseResolves format | Use `[[{...}]]` (array of arrays) |
| `Data key not found` | dataKey doesn't match SDK keyName | Ensure rule.dataKey == SDK.keyName |
| `URL mismatch` | URL doesn't match task's templateId | Use exact URL from rule |
| `Already completed` | Task already processed | Check request.completed first |

### Error Handling Example

```javascript
try {
  await app.submitAttestation(...);
} catch (e) {
  if (e.message.includes('Data key not found')) {
    console.error('Rule dataKey must match SDK keyName');
  } else if (e.message.includes('URL mismatch')) {
    console.error('URL must match rule exactly');
  }
  throw e;
}
```

## Rules Configuration

### Current Rules

| ID | URL | Data Key | Score | Max Age |
|----|-----|----------|-------|---------|
| 0 | Coinbase BTC/USD | `data.rates.USD` | 100 | 1h |
| 1 | Coinbase ETH/USD | `data.rates.USD` | 95 | 2h |
| 2 | Coinbase BTC/USD | `btcPrice` | 100 | 1h |

**Working Rule:** Rule 2 with `dataKey="btcPrice"` matches SDK `keyName`.

### Adding New Rules

```javascript
await app.addRule(
  'https://api.example.com/endpoint',
  'valueKey',  // Must match SDK keyName
  50,          // score
  2,           // decimals
  3600,        // maxAge in seconds
  'Description',
  { gasLimit: 200000 }
);
```

## Best Practices

1. **Always use exact fee**: 10^10 wei
2. **responseResolves as array of arrays**: `[[{...}]]`
3. **Match dataKey to keyName**: Rule's dataKey == SDK's keyName
4. **Convert timestamp**: SDK returns ms, contract expects seconds
5. **Check completed status**: Avoid re-processing
6. **Handle attestation timeout**: SDK may take 30-60 seconds
