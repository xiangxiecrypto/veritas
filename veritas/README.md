# Veritas 🔱

> **The Truth Layer for AI Agents — ERC-8004 + Primus zkTLS on Base**

[![Base](https://img.shields.io/badge/Base-L2-0052FF)](https://base.org)
[![Primus](https://img.shields.io/badge/zkTLS-Primus-6366F1)](https://primuslabs.xyz)
[![ERC-8004](https://img.shields.io/badge/Standard-ERC--8004-blue)](https://eips.ethereum.org/EIPS/eip-8004)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## 🎯 What is Veritas?

**Veritas** (Latin: *Truth*) is the trust infrastructure for the AI agent economy. It solves the "trust but verify" problem for autonomous agents operating across platforms.

### The Problem
- Users can't verify agent claims
- No standardized reputation system
- API calls are unverifiable
- Cross-platform identity doesn't exist

### The Solution
- **Cryptographic Proofs:** Every API call generates a zkTLS attestation
- **Portable Identity:** ERC-721 NFT identities that travel across platforms  
- **Verifiable Reputation:** Built on actual proofs, not claims
- **Standardized Protocol:** Works with any agent framework

---

## 🚀 Quick Start

### For Agent Developers

```bash
# Install the SDK
npm install @veritas/sdk

# Register your agent
import { VeritasAgent } from '@veritas/sdk';

const agent = new VeritasAgent({
  name: "TradingBot_Alpha",
  primusAppId: process.env.PRIMUS_APP_ID,
  network: 'base-mainnet'
});

// Attest any API call
const priceData = await agent.attest(
  () => fetch('https://api.exchange.com/price/BTC'),
  { label: 'BTC_price_check' }
);

// Proof is automatically stored on-chain
console.log(priceData.proofHash); // 0xabc...
```

### For Consumers

```javascript
// Verify any agent before trusting
import { Veritas } from '@veritas/sdk';

const agent = await Veritas.getAgent('0xAgentID...');

// Check verified history
console.log(agent.stats.verifiedCalls); // 1,247
console.log(agent.stats.successRate);   // 98.5%

// Verify a specific claim
const isValid = await Veritas.verifyProof(
  '0xProofHash...',
  agent.identity
);
```

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Agent SDK  │────▶│ Primus zkTLS │────▶│  Base L2    │
│  (Client)   │     │  (Attestation)│     │ (Registry)  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                           │
       │                                           │
       ▼                                           ▼
┌─────────────┐                          ┌─────────────┐
│  HTTPS API  │                          │ ERC-8004    │
│  (Any API)  │                          │ Contracts   │
└─────────────┘                          └─────────────┘
```

### Three Core Registries

1. **Identity Registry** (`0x8004A169...`)
   - Agent NFTs and metadata
   - Cross-platform identifier
   - Immutable agent history

2. **Validation Registry** (Veritas Extension)
   - zkTLS proof storage
   - API call attestations
   - Verification queries

3. **Reputation Registry** (`0x8004BAa1...`)
   - Scoring and reviews
   - Historical performance
   - Community trust metrics

---

## 📚 Documentation

- [Architecture Deep Dive](./docs/architecture.md)
- [SDK Guide](./docs/sdk-guide.md) — Getting started with the TypeScript SDK
- [API Reference](./docs/api-reference.md) — Complete API documentation
- [Smart Contracts](./docs/contracts.md) — Contract addresses and ABIs

### Use Cases

- [Moltbook Agent Verification](./docs/use-case-moltbook-verification.md) — Prove X/Twitter ownership
- [Trading Bot Verification](./docs/use-case-trading-verification.md) — Verify execution prices
- [Data Oracle Verification](./docs/use-case-oracle-verification.md) — Attest data sources

---

## 🔧 Smart Contracts

### Base Mainnet

| Contract | Address | Purpose |
|----------|---------|---------|
| IdentityRegistry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | ERC-8004 standard |
| ReputationRegistry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | Reputation scoring |
| ValidationRegistry | *TBD* | zkTLS proof storage |

### Base Sepolia (Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Test identity |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Test reputation |
| ValidationRegistry | *TBD* | Test validation |

---

## 🛣️ Roadmap

- [x] Architecture design
- [x] Documentation framework
- [ ] ValidationRegistry.sol deployment
- [ ] TypeScript SDK alpha release
- [ ] Example integrations
- [ ] Security audit
- [ ] Mainnet launch

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ using ERC-8004, Primus zkTLS, and Base L2**

> *"In Veritas we trust, with proofs we verify"*
