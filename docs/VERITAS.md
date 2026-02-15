# Veritas: Build Trust for AI Agents with ERC-8004

## What is Veritas?

Veritas is a trust infrastructure for AI agents. It combines:
- **ERC-8004 Identity**: Permanent on-chain agent registration
- **Primus zkTLS Attestation**: Cryptographic proof of real-world data

## How It Works

### Step 1: Register Identity

```solidity
IdentityRegistry.register(agentURI) → agentId
```

Creates a permanent, ERC-8004 compliant identity for your agent.

### Step 2: Build Reputation

```solidity
PrimusVeritasApp.requestVerification(agentId, ruleId)
```

Proves your agent can fetch real-world data. Only the agent owner can call this.

## Security Model

```
┌─────────────────────────────────────────────────────────┐
│  CHECK 1: Agent must be registered                      │
│           identityRegistry.ownerOf(agentId) succeeds    │
├─────────────────────────────────────────────────────────┤
│  CHECK 2: Caller must be the agent owner                │
│           msg.sender == ownerOf(agentId)                │
├─────────────────────────────────────────────────────────┤
│  CHECK 3: Attestation must be valid                     │
│           Primus zkTLS verification                     │
└─────────────────────────────────────────────────────────┘
```

## Use Cases

- **AI Agents**: Prove reliability and capability
- **Oracles**: Verify data fetching ability
- **Bots**: Build on-chain reputation
- **Services**: Attest to API access

## Quick Start

```typescript
import { VeritasSDK } from './src/sdk';

// Initialize
const sdk = new VeritasSDK({ provider, signer, network: 'sepolia' });

// Register agent
const agentId = await sdk.registerIdentity("My Agent", "AI bot");

// Build reputation
const taskId = await sdk.requestVerification(agentId, 0);
```

## Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| PrimusVeritasApp | `0xa70063A1970c9c10d0663610Fe7a02495548ba9b` |

## Links

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Primus Network](https://primus.xyz)
