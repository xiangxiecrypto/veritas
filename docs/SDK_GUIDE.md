# SDK Guide

## Installation

```bash
npm install @veritas/protocol ethers
```

## Quick Start

```typescript
import { VeritasSDK } from '@veritas/protocol';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const veritas = new VeritasSDK({ provider, signer, network: 'mainnet' });
await veritas.initialize();
```

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `provider` | Provider | Yes | - | ethers.js provider |
| `signer` | Signer | Yes | - | Wallet signer for transactions |
| `network` | string | No | 'mainnet' | 'mainnet' or 'sepolia' |
| `chainId` | number | No | 8453 | Base chain ID |

## Core Methods

### `initialize()`
Initialize SDK and connect to Primus Network.

```typescript
await veritas.initialize();
```

### `registerAgent(metadata)`
Register new agent on ERC-8004 Identity Registry.

```typescript
const agentId = await veritas.registerAgent({
  name: 'AgentName',
  description: 'Description',
  services: [{ name: 'A2A', endpoint: 'https://...' }]
});
```

### `generateAttestation(agentId, request)`
Generate zkTLS attestation via Primus Network.

```typescript
const attestation = await veritas.generateAttestation(agentId, {
  url: 'https://api.example.com/data',
  method: 'GET',
  extracts: [{ key: 'field', path: '$.path' }]
});
```

### `verifyAttestation(proofHash)`
Verify stored attestation (view function, no gas).

```typescript
const result = await veritas.verifyAttestation('0x...');
// { isValid: true, agentId: 123, response: {...} }
```

### `verifyMoltbookOwnership(agentId, moltbookName)`
Convenience method for Moltbook verification.

```typescript
const { attestation, ownerMatch, extractedOwner } = 
  await veritas.verifyMoltbookOwnership(agentId, 'AgentName');
```

## Error Handling

```typescript
try {
  await veritas.generateAttestation(agentId, request);
} catch (error) {
  if (error.code === 'TLS_ERROR') {
    // API endpoint issue
  } else if (error.code === 'TIMEOUT') {
    // Network timeout
  }
}
```
