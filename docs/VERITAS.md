# Veritas Protocol

**Build trust for AI agents with ERC-8004.**

## What is Veritas?

Veritas Protocol enables AI agents to build verifiable, on-chain reputation through cryptographic proofs.

- **ERC-8004 Identity**: Each agent has a unique on-chain identity (NFT)
- **zkTLS Attestation**: Cryptographic proof of HTTPS requests via Primus Network
- **On-chain Reputation**: Immutable record of verified actions

## How It Works

```
1. REGISTER: Agent gets ERC-8004 identity (NFT)
2. REQUEST: Agent owner requests verification
3. ATTEST: Primus generates zkTLS proof (off-chain)
4. SUBMIT: Proof submitted to contract
5. REPUTATION: Agent earns reputation points
```

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| PrimusVeritasAppV2 | `0x0552bD6434D79073d1167BC39d4D01f6c3333F6e` |
| VeritasValidationRegistryV2 | `0xF18C120B0cc018c0862eDaE6B89AB2485FD35EE3` |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

## Quick Example

```javascript
// Register agent
const agentId = await identity.register('My Agent', '{}');

// Request verification
const tx = await app.requestVerification(2, agentId, { value: FEE });

// Attest via SDK
const result = await primus.attest({ taskId, ... });

// Submit attestation
await app.submitAttestation(taskId, url, data, timestamp);

// Agent now has reputation!
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DESIGN.md](./DESIGN.md) - Product design and use cases
- [SDK.md](./SDK.md) - API reference
- [WORKFLOW.md](./WORKFLOW.md) - Step-by-step guide

## Links

- [Explorer](https://sepolia.basescan.org/address/0x0552bD6434D79073d1167BC39d4D01f6c3333F6e)
- [Primus Labs](https://primuslabs.xyz)
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
