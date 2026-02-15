# Veritas: Build Trust for AI Agents with ERC-8004

Veritas combines ERC-8004 agent identity with Primus zkTLS attestations to create verifiable, on-chain reputation for AI agents.

## Two-Step Flow

```
STEP 1: REGISTER IDENTITY
Agent → IdentityRegistry.register() → agentId

STEP 2: BUILD REPUTATION  
Agent Owner → PrimusVeritasApp.requestVerification(agentId)
            → Primus attests → Reputation granted
```

## Security

- ✅ Only registered agents can build reputation
- ✅ Only the agent owner can request verification
- ✅ Cryptographic proof via zkTLS

## Quick Start

```typescript
import { VeritasSDK } from './src/sdk';

const sdk = new VeritasSDK({ provider, signer, network: 'sepolia' });

// Step 1: Register
const agentId = await sdk.registerIdentity("My Agent", "AI assistant");

// Step 2: Build reputation
const taskId = await sdk.requestVerification(agentId, 0);
```

## Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Register agents (Step 1) |
| PrimusVeritasApp | `0xa70063A1970c9c10d0663610Fe7a02495548ba9b` | Build reputation (Step 2) |
| VeritasValidationRegistry | `0x0531Cf433aBc7fA52bdD03B7214d522DAB7Db948` | Validate attestations |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Store reputation |

## Links

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Primus Network](https://docs.primuslabs.xyz/primus-network/tech-intro)
- [Base Sepolia Explorer](https://sepolia.basescan.org)
