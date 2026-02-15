# Veritas Protocol

**Build trust for AI agents with ERC-8004.**

Veritas is a trust infrastructure that combines ERC-8004 agent identity with Primus zkTLS attestations to build verifiable reputation for AI agents.

## Two-Step Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: REGISTER IDENTITY (ERC-8004)                           │
│                                                                 │
│  Agent → IdentityRegistry.register() → gets agentId             │
│                                                                 │
│  This creates a permanent, on-chain identity for the agent.    │
│                                                                 │
│  Contract: 0x8004A818BFB912233c491871b3d84c89A494BD9e           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: BUILD REPUTATION (Primus Attestation)                  │
│                                                                 │
│  Agent Owner → PrimusVeritasApp.requestVerification(agentId)    │
│                                                                 │
│  ✅ Only registered agents can build reputation                 │
│  ✅ Only the agent owner can request verification               │
│                                                                 │
│  Primus attests off-chain → Callback → Reputation granted       │
└─────────────────────────────────────────────────────────────────┘
```

## Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **IdentityRegistry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Register agent identities (Step 1) |
| **PrimusVeritasApp** | `0xa70063A1970c9c10d0663610Fe7a02495548ba9b` | Build reputation via attestation (Step 2) |
| **VeritasValidationRegistry** | `0x0531Cf433aBc7fA52bdD03B7214d522DAB7Db948` | Validate attestations |
| **ReputationRegistry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Store reputation scores |
| **Primus TaskContract** | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` | Primus zkTLS infrastructure |

**Owner:** `0x89BBf3451643eef216c3A60d5B561c58F0D8adb9`

## Security

### Only Registered Agents Can Build Reputation
```solidity
// In PrimusVeritasApp.requestVerification()
address agentOwner = identityRegistry.ownerOf(agentId);
require(msg.sender == agentOwner, "Not agent owner");
```

This ensures:
1. Agent must be registered in IdentityRegistry (Step 1)
2. Caller must be the owner of that agent
3. Nobody can build reputation for an agent they don't own

## Verification Rules

| ID | URL | Score | Max Age | Description |
|----|-----|-------|---------|-------------|
| 0 | Coinbase BTC/USD | 100 | 1h | Proves agent can fetch BTC price |
| 1 | Coinbase ETH/USD | 95 | 2h | Proves agent can fetch ETH price |

## SDK Usage

```typescript
import { VeritasSDK } from './src/sdk';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const sdk = new VeritasSDK({ provider, signer, network: 'sepolia' });

// STEP 1: Register identity
const agentId = await sdk.registerIdentity("My Agent", "AI assistant");

// STEP 2: Build reputation
const taskId = await sdk.requestVerification(agentId, 0); // Rule 0 = BTC price

// Or do both in one call:
const { agentId, taskId } = await sdk.registerAndVerify("My Agent", "AI assistant");
```

## Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  IdentityRegistry│     │  PrimusVeritasApp   │     │ ReputationRegistry│
│    (ERC-8004)    │     │                     │     │    (ERC-8004)    │
├──────────────────┤     ├─────────────────────┤     ├──────────────────┤
│ register()       │────→│ requestVerification │────→│ giveFeedback()   │
│ ownerOf()        │     │ onAttestationComplete│     │ getSummary()     │
│ tokenURI()       │     │                     │     │                  │
└──────────────────┘     └─────────────────────┘     └──────────────────┘
         ↑                         ↑                         ↑
         │                         │                         │
    Step 1: Identity         Step 2: Attestation       Result: Reputation
```

## Primus Interface

```solidity
submitTask(address, string, uint256, uint8, address) // 0x5ae543eb
queryTask(bytes32) // 0x8d3943ec
```

## Files

- `contracts/PrimusVeritasApp.sol` - Main app with agent verification
- `contracts/VeritasValidationRegistry.sol` - Pure validation logic
- `contracts/PrimusTaskInterface.sol` - Primus interface
- `src/sdk.ts` - TypeScript SDK
- `scripts/deploy-veritas-v2.js` - Deployment script

## Deprecated

- `contracts/_deprecated/` - Old contracts
- `scripts/_deprecated/` - Old scripts
- `_archive/` - Old docs
