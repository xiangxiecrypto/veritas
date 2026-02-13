# Veritas Protocol 🔱

**ERC-8004 Compliant Trust Infrastructure for AI Agents**

Veritas Protocol provides cryptographic proof of identity and reputation for AI agents using:
- **ERC-8004** (official Ethereum standard for trustless agents)
- **Primus Network SDK** (decentralized zkTLS attestations, wallet-based)
- **Base L2** (fast, cheap, Ethereum-secured)

## Quick Start

```bash
npm install @veritas/protocol
```

```typescript
import { VeritasSDK } from '@veritas/protocol';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const veritas = new VeritasSDK({
  provider,
  signer, // Required for Primus Network SDK
  network: 'mainnet'
});

// Initialize (connects to Primus Network)
await veritas.initialize();

// Register agent on ERC-8004 Identity Registry
const agentId = await veritas.registerAgent({
  name: 'MyVerifiedAgent',
  description: 'AI agent with cryptographic attestations',
  services: [
    { name: 'A2A', endpoint: 'https://agent.example.com/a2a' },
    { name: 'MCP', endpoint: 'https://agent.example.com/mcp' }
  ]
});

// Generate decentralized zkTLS attestation
const attestation = await veritas.generateAttestation(agentId, {
  url: 'https://api.example.com/data',
  method: 'GET',
  extracts: [{ key: 'value', path: '$.data.value' }]
});
```

## What's Different from Enterprise SDK?

| Feature | Enterprise SDK | **Network SDK (This)** |
|---------|---------------|------------------------|
| **Authentication** | App ID + Secret | **Wallet signatures** |
| **Decentralization** | Server-based | **Decentralized network** |
| **Setup** | Needs app credentials | **Just a wallet** |
| **Verification** | Enterprise verification | **Network consensus** |

**We use Network SDK** for fully decentralized attestations without relying on app credentials.

## Architecture

Veritas uses **official ERC-8004 contracts** deployed on Base:

| Component | Address | Purpose |
|-----------|---------|---------|
| **Identity Registry** | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | ERC-721 agent registration |
| **Reputation Registry** | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | On-chain feedback |
| **Validation Registry** | *Deploy your own* | Primus zkTLS attestations |

## Why Primus Network SDK?

```
┌─────────────────────────────────────────────────────────┐
│                    Primus Network                        │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐             │
│  │ Attester│────│  ZKTLS  │────│Verifier │             │
│  │  Node   │    │  Proof  │    │  Node   │             │
│  └─────────┘    └─────────┘    └─────────┘             │
│       │                              │                  │
│       └──────────┬───────────────────┘                  │
│                  │                                      │
│           Decentralized Consensus                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Veritas Smart      │
              │   Contract (Base)    │
              └──────────────────────┘
```

- **No app credentials** — attestations secured by your wallet
- **Decentralized verification** — Multiple nodes verify the proof
- **Cryptographic guarantees** — zkTLS ensures TLS session integrity
- **On-chain storage** — Proof hash stored on Base L2

## Use Case: Moltbook Agent Verification

```typescript
// Prove you own a Moltbook agent by verifying the wallet address
const { attestation, ownerMatch, extractedOwner } = await veritas.verifyMoltbookOwnership(
  agentId, 
  'CilohPrimus'  // Your Moltbook agent name
);

// Result includes:
// - attestation.requestHash (on-chain reference)
// - attestation.taskId (Primus Network task)
// - extractedOwner (wallet from Moltbook API)
// - ownerMatch (true if matches your wallet)

// Anyone can verify:
const isValid = await veritas.verifyAttestation(attestation.requestHash);
// { isValid: true, agentId: 123, response: 100 }
```

**No Twitter API needed** — verification happens through Moltbook's own API, checking that the agent's registered owner matches the wallet creating the attestation.

## Deployment

### Base Mainnet (Production)
```typescript
const veritas = new VeritasSDK({
  provider,
  signer,
  network: 'mainnet',
  chainId: 8453
});
```

### Base Sepolia (Testnet)
```typescript
const veritas = new VeritasSDK({
  provider,
  signer,
  network: 'sepolia',
  chainId: 84532
});
```

## Smart Contracts

### VeritasValidationRegistry.sol

Extends ERC-8004 with Primus Network support:

```solidity
// ERC-8004 compliant interface
function validationRequest(address validator, uint256 agentId, ...);
function validationResponse(bytes32 requestHash, uint8 response, ...);

// Veritas-specific: Submit Primus Network attestation
function submitPrimusAttestation(
    uint256 agentId,
    bytes32 proofHash,
    string apiEndpoint,
    bytes primusProof,
    string requestURI
) returns (bytes32 requestHash);
```

## Project Structure

```
.
├── src/
│   └── sdk.ts              # TypeScript SDK (Primus Network)
├── contracts/
│   └── VeritasValidationRegistry.sol
├── examples/
│   ├── full-registration.ts   # Complete walkthrough
│   ├── moltbook-verification.ts
│   └── api-verification.ts    # Generic API attestation
└── package.json
```

## Environment Variables

```bash
# Required
PRIVATE_KEY=0x...                    # Your wallet private key

# Network (defaults to Base Mainnet)
RPC_URL=https://mainnet.base.org     # Or Sepolia for testing
```

## Documentation

- [Product Design](./docs/PRODUCT_DESIGN.md) - Vision, use cases, value propositions
- [Architecture](./docs/ARCHITECTURE.md) - System design, data flows, security model
- [Workflow](./docs/WORKFLOW.md) - Developer workflows and common patterns
- [SDK Guide](./docs/SDK_GUIDE.md) - Installation and quick start
- [API Reference](./docs/API_REFERENCE.md) - Complete API documentation
- [End-to-End Reputation](./docs/END_TO_END_REPUTATION.md) - Building trust through attestations + reputation
- [ERC-8004 Spec](https://eips.ethereum.org/EIPS/eip-8004)

## License

MIT
