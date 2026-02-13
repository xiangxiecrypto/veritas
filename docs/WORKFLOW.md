# Veritas Protocol - Workflow

## Developer Workflows

### 1. Initial Setup

```bash
# 1. Install dependencies
npm install @veritas/protocol ethers

# 2. Set up environment
cat > .env << EOF
PRIVATE_KEY=0x...
RPC_URL=https://mainnet.base.org  # or https://sepolia.base.org
EOF

# 3. Initialize SDK
import { VeritasSDK } from '@veritas/protocol';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const veritas = new VeritasSDK({
  provider,
  signer,
  network: 'mainnet'  // or 'sepolia'
});

await veritas.initialize();
console.log('Veritas SDK initialized');
```

### 2. Register a New Agent

```typescript
// Register agent with ERC-8004 Identity Registry
const agentId = await veritas.registerAgent({
  name: 'MyVerifiedAgent',
  description: 'AI agent with cryptographic attestations',
  services: [
    { 
      name: 'A2A', 
      endpoint: 'https://agent.example.com/a2a',
      protocol: 'A2A'
    },
    { 
      name: 'MCP', 
      endpoint: 'https://agent.example.com/mcp',
      protocol: 'MCP'
    }
  ],
  metadata: {
    version: '1.0.0',
    author: 'xie.xiang@example.com',
    repository: 'https://github.com/example/my-agent'
  }
});

console.log(`Agent registered with ID: ${agentId}`);
// Agent ID is used for all future operations
```

**What happens**:
1. SDK constructs agent metadata JSON
2. Calls `IdentityRegistry.register()` with your wallet
3. Mints ERC-721 NFT representing agent identity
4. Emits `AgentRegistered` event
5. Returns numeric agent ID

### 3. Verify Moltbook Ownership

```typescript
// Prove you own a Moltbook agent
const result = await veritas.verifyMoltbookOwnership(
  agentId,           // Your ERC-8004 agent ID
  'CilohPrimus'      // Your Moltbook agent name
);

console.log('Attestation:', result.attestation);
console.log('Owner matches:', result.ownerMatch);
console.log('Extracted owner:', result.extractedOwner);

if (result.ownerMatch) {
  console.log('✅ Verified: You own this Moltbook agent');
} else {
  console.log('❌ Mismatch: Wallets do not match');
}
```

**What happens**:
1. SDK queries Moltbook API: `GET /api/v1/agents/CilohPrimus`
2. Extracts `wallet_address` from response
3. Generates Primus zkTLS attestation of the API call
4. Compares extracted wallet with SDK's wallet address
5. Stores attestation on-chain via ValidationRegistry
6. Returns result with attestation details

**Timeline**:
```
T+0s:    Call verifyMoltbookOwnership()
T+2s:    Moltbook API queried
T+5s:    Primus Network generates proof
T+10s:   Attestation submitted to Base L2
T+15s:   Confirmation received, result returned
```

### 4. Generate Generic API Attestation

```typescript
// Attest to any HTTPS API call
const attestation = await veritas.generateAttestation(agentId, {
  url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  },
  extracts: [
    { 
      key: 'btcPrice', 
      path: '$.price'      // JSONPath extraction
    },
    {
      key: 'timestamp',
      path: '$.time'
    }
  ]
});

console.log('Request hash:', attestation.requestHash);
console.log('Task ID:', attestation.taskId);
console.log('Extracted data:', attestation.response);
```

**What happens**:
1. SDK constructs attestation request
2. Primus Network nodes execute TLS handshake
3. API response captured in zero-knowledge proof
4. Specified fields extracted and encoded
5. Proof submitted to ValidationRegistry
6. Returns proof hash for future verification

### 5. Verify an Attestation

```typescript
// Anyone can verify an attestation
const verification = await veritas.verifyAttestation(
  '0xabc123...'  // Proof hash from attestation
);

console.log('Is valid:', verification.isValid);
console.log('Agent ID:', verification.agentId);
console.log('Response data:', verification.response);
console.log('Timestamp:', verification.timestamp);
```

**What happens**:
1. SDK queries ValidationRegistry
2. Retrieves stored attestation data
3. Verifies proof signature and timestamps
4. Returns verification result

**Note**: This is a `view` function — no gas required.

### 6. Update Agent Metadata

```typescript
// Update agent information
await veritas.updateAgent(agentId, {
  description: 'Updated description',
  services: [
    { name: 'A2A', endpoint: 'https://new-endpoint.com/a2a' }
  ]
});

console.log('Agent metadata updated');
```

### 7. Check Agent Reputation

```typescript
// Get agent reputation score
const reputation = await veritas.getReputation(agentId);

console.log('Total feedback:', reputation.totalFeedback);
console.log('Average score:', reputation.averageScore);
console.log('Positive %:', reputation.positivePercentage);
```

## Operational Workflows

### Automated Attestation (Cron)

```typescript
// Run every hour to attest to price feed
async function hourlyPriceAttestation() {
  const attestation = await veritas.generateAttestation(agentId, {
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    method: 'GET',
    extracts: [{ key: 'btcPrice', path: '$.bitcoin.usd' }]
  });
  
  // Store for reference
  await db.storeAttestation(attestation);
  
  console.log(`Attested to BTC price at ${new Date().toISOString()}`);
}

// Schedule with node-cron or similar
cron.schedule('0 * * * *', hourlyPriceAttestation);
```

### Batch Verification

```typescript
// Verify multiple attestations at once
const proofHashes = [
  '0xabc123...',
  '0xdef456...',
  '0xghi789...'
];

const results = await Promise.all(
  proofHashes.map(hash => veritas.verifyAttestation(hash))
);

const allValid = results.every(r => r.isValid);
console.log('All attestations valid:', allValid);
```

### Integration with Agent Framework

```typescript
// Example: LangChain integration
import { Tool } from 'langchain/tools';

class VeritasVerificationTool extends Tool {
  name = 'veritas_verify';
  description = 'Verify an agent attestation';
  
  async _call(proofHash: string) {
    const result = await veritas.verifyAttestation(proofHash);
    return JSON.stringify(result);
  }
}

// Use in agent
const tools = [new VeritasVerificationTool()];
const agent = initializeAgentExecutor(tools, llm);
```

## Troubleshooting Workflows

### Issue: "Agent not found"

```typescript
// Check if agent exists
const agent = await veritas.getAgent(agentId);
if (!agent) {
  console.log('Agent not registered. Registering now...');
  const newId = await veritas.registerAgent({...});
}
```

### Issue: "Attestation generation failed"

```typescript
try {
  const attestation = await veritas.generateAttestation(agentId, request);
} catch (error) {
  if (error.message.includes('TLS')) {
    console.log('API endpoint TLS issue. Check URL and certificate.');
  } else if (error.message.includes('timeout')) {
    console.log('Primus Network timeout. Retry with longer timeout.');
  }
}
```

### Issue: "Owner mismatch"

```typescript
const result = await veritas.verifyMoltbookOwnership(agentId, name);
if (!result.ownerMatch) {
  console.log('Wallet mismatch!');
  console.log('Your wallet:', signer.address);
  console.log('Moltbook wallet:', result.extractedOwner);
  console.log('Update Moltbook profile to match your wallet.');
}
```

## Testing Workflows

### Local Testing (Hardhat)

```typescript
// Use local fork for testing
const provider = new ethers.JsonRpcProvider('http://localhost:8545');

// Impersonate account for testing
await network.provider.request({
  method: 'hardhat_impersonateAccount',
  params: ['0x...']
});
```

### Testnet Workflow

```typescript
// Always test on Sepolia first
const veritas = new VeritasSDK({
  provider,
  signer,
  network: 'sepolia'  // Base Sepolia testnet
});

// Get testnet ETH from Base faucet
// https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
```

## Production Deployment Checklist

- [ ] Use mainnet RPC endpoint
- [ ] Verify contract addresses match mainnet
- [ ] Test with small value transactions first
- [ ] Monitor gas costs
- [ ] Set up error alerting
- [ ] Document agent ID for reference
- [ ] Backup private key securely
- [ ] Set up attestation monitoring

## Common Patterns

### Pattern: Prove-and-Act

```typescript
// Prove data source, then act on it
async function tradeWithProof() {
  // 1. Generate attestation
  const attestation = await veritas.generateAttestation(agentId, {
    url: 'https://api.exchange.com/price',
    extracts: [{ key: 'price', path: '$.price' }]
  });
  
  // 2. Verify on-chain
  const verified = await veritas.verifyAttestation(attestation.requestHash);
  
  // 3. Only act if verified
  if (verified.isValid && verified.response.price > threshold) {
    await executeTrade(verified.response.price);
  }
}
```

### Pattern: Reputation-Gated Action

```typescript
// Only allow high-reputation agents
async function gatedAction(agentId: number) {
  const reputation = await veritas.getReputation(agentId);
  
  if (reputation.averageScore < 4.0) {
    throw new Error('Reputation too low');
  }
  
  await performPrivilegedAction();
}
```
