# Veritas Protocol 🔱

**ERC-8004 Compliant Trust Infrastructure for AI Agents**

Veritas Protocol provides cryptographic proof of identity and reputation for AI agents using:
- **ERC-8004** (official Ethereum standard for trustless agents)
- **Primus zkTLS** (zero-knowledge TLS attestations)
- **Base L2** (fast, cheap, Ethereum-secured)

## Quick Start

```bash
npm install @veritas/protocol
```

```typescript
import { VeritasSDK } from '@veritas/protocol';

const veritas = new VeritasSDK({
  provider,  // Base Mainnet provider
  signer,    // Your wallet
  network: 'mainnet'
});

// Register agent on ERC-8004 Identity Registry
const agentId = await veritas.registerAgent({
  name: 'MyVerifiedAgent',
  description: 'AI agent with cryptographic attestations',
  services: [
    { name: 'A2A', endpoint: 'https://agent.example.com/a2a' },
    { name: 'MCP', endpoint: 'https://agent.example.com/mcp' }
  ]
});

// Generate zkTLS attestation
const attestation = await veritas.generateAttestation(agentId, {
  url: 'https://api.twitter.com/2/users/by/username/myagent',
  method: 'GET',
  responsePath: '$.data.id'
});
```

## Architecture

Veritas uses the **official ERC-8004 contracts** deployed on Base:

| Component | Address | Purpose |
|-----------|---------|---------|
| **Identity Registry** | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | ERC-721 based agent registration |
| **Reputation Registry** | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | On-chain feedback & scoring |
| **Validation Registry** | *Deploy your own* | Primus zkTLS attestations |

## Why ERC-8004?

Instead of building custom registries, Veritas implements **ERC-8004**, the official Ethereum standard for trustless agents:

- ✅ **Standardized** - Works with any ERC-8004 compliant tool
- ✅ **Interoperable** - Agents registered here work with any ERC-8004 dApp
- ✅ **Proven** - Developed by MetaMask, Coinbase, Google, Ethereum Foundation
- ✅ **Future-proof** - Part of the official Ethereum standards track

## Use Case: Moltbook Agent Verification

The primary use case is verifying Moltbook agent ownership:

```typescript
// Prove you own the Twitter/X linked to your Moltbook agent
const attestation = await veritas.verifyMoltbookTwitter(agentId, 'myhandle');

// Other agents can verify:
const isValid = await veritas.verifyAttestation(attestation.requestHash);
// Returns: { isValid: true, agentId: 123, response: 100 }
```

## Deployment

### Base Mainnet (Production)
```typescript
const veritas = new VeritasSDK({ provider, signer, network: 'mainnet' });
// Uses:
// - IdentityRegistry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
// - ReputationRegistry: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
```

### Base Sepolia (Testnet)
```typescript
const veritas = new VeritasSDK({ provider, signer, network: 'sepolia' });
// Uses:
// - IdentityRegistry: 0x8004A818BFB912233c491871b3d84c89A494BD9e
// - ReputationRegistry: 0x8004B663056A597Dffe9eCcC1965A193B7388713
```

## Smart Contracts

### VeritasValidationRegistry.sol

Extends ERC-8004 Validation Registry with Primus zkTLS support:

```solidity
// ERC-8004 compliant interface
function validationRequest(address validator, uint256 agentId, string requestURI, bytes32 requestHash);
function validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag);

// Veritas-specific: Submit Primus zkTLS proof
function submitPrimusAttestation(
    uint256 agentId,
    bytes32 proofHash,
    string apiEndpoint,
    bytes primusProof,
    string requestURI
) returns (bytes32 requestHash);
```

## Documentation

- [SDK Guide](./docs/sdk-guide.md) - TypeScript integration
- [API Reference](./docs/api-reference.md) - Complete API docs
- [ERC-8004 Spec](https://eips.ethereum.org/EIPS/eip-8004) - Official standard

## Project Structure

```
.
├── src/
│   └── sdk.ts              # TypeScript SDK (ERC-8004 compliant)
├── contracts/
│   └── VeritasValidationRegistry.sol  # zkTLS-enabled validation
├── examples/
│   ├── full-registration.ts   # Complete walkthrough
│   ├── moltbook-verification.ts
│   └── twitter-verification.ts
├── docs/
│   ├── sdk-guide.md
│   └── api-reference.md
└── package.json
```

## License

MIT
