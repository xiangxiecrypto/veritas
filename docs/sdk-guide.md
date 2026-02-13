# SDK Guide

Complete guide to integrating Veritas into your AI agent.

## Installation

```bash
npm install @veritas/sdk
# or
yarn add @veritas/sdk
```

## Quick Start

### 1. Initialize the SDK

```typescript
import { VeritasAgent } from '@veritas/sdk';

const agent = new VeritasAgent({
  name: "MyAgent",
  primusAppId: process.env.PRIMUS_APP_ID,
  primusAppSecret: process.env.PRIMUS_APP_SECRET,
  network: 'base-mainnet', // or 'base-sepolia'
  wallet: process.env.PRIVATE_KEY
});
```

### 2. Register Your Agent

One-time registration creates your ERC-721 identity:

```typescript
const identity = await agent.register({
  name: "TradingBot_Alpha",
  description: "Automated trading agent with verifiable execution",
  avatar: "https://...",
  metadata: {
    type: "trading",
    strategy: "sentiment-delta",
    maxLeverage: 10
  }
});

console.log(identity.tokenId); // Your unique agent ID
```

### 3. Attest API Calls

Wrap any API call with automatic attestation:

```typescript
// Simple attestation
const result = await agent.attest(
  () => fetch('https://api.exchange.com/price/BTC')
);

// With custom metadata
const result = await agent.attest(
  () => fetch('https://api.exchange.com/execute', {
    method: 'POST',
    body: JSON.stringify({action: 'buy', amount: 100})
  }),
  {
    label: 'BTC_long_entry',
    tags: ['trade', 'BTC', 'aggressive'],
    saveToChain: true
  }
);

console.log(result.proofHash); // On-chain proof reference
```

### 4. Verify Proofs

```typescript
import { Veritas } from '@veritas/sdk';

// Verify any proof
const isValid = await Veritas.verifyProof(
  '0xProofHash...',
  agentAddress
);

// Get proof details
const proof = await Veritas.getProof('0xProofHash...');
console.log(proof.timestamp);  // When it happened
console.log(proof.apiEndpoint); // What was called
console.log(proof.responseHash); // Hash of response
```

## Advanced Usage

### Batch Attestations

```typescript
const proofs = await agent.attestBatch([
  { fn: () => fetch('/price/BTC'), label: 'BTC' },
  { fn: () => fetch('/price/ETH'), label: 'ETH' },
  { fn: () => fetch('/price/SOL'), label: 'SOL' }
]);
```

### Custom Validation Rules

```typescript
const agent = new VeritasAgent({
  // ... config
  validationRules: {
    requireTimestamp: true,
    maxResponseAge: 300000, // 5 minutes
    allowedHosts: ['api.exchange.com', 'data.provider.com']
  }
});
```

## Error Handling

```typescript
try {
  const result = await agent.attest(apiCall);
} catch (error) {
  if (error.code === 'ATTESTATION_FAILED') {
    // zkTLS proof generation failed
  }
  if (error.code === 'CHAIN_REJECTED') {
    // On-chain validation failed
  }
}
```

## Next Steps

- See [API Reference](./api-reference.md) for complete method docs
- Check [Example Integrations](../examples/) for real-world usage
- Read [Smart Contracts](./contracts.md) for on-chain details
