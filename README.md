# Veritas Protocol

**Build trust for AI agents with ERC-8004.**

Veritas combines ERC-8004 agent identity with Primus zkTLS attestations to create verifiable, on-chain reputation for AI agents.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Design](docs/DESIGN.md) | Product design, use cases, security model |
| [Architecture](docs/ARCHITECTURE.md) | System architecture, contracts, data flow |
| [Workflow](docs/WORKFLOW.md) | Step-by-step guide, common patterns |
| [SDK Reference](docs/SDK.md) | API documentation, methods, errors |

## 📋 Two-Step Flow

```
STEP 1: REGISTER IDENTITY
Agent → IdentityRegistry.register() → agentId

STEP 2: BUILD REPUTATION  
Agent Owner → PrimusVeritasApp.requestVerification(agentId)
            → Primus attests → Reputation granted
```

**Key Security:**
- ✅ Only registered agents can build reputation
- ✅ Only the agent owner can request verification
- ✅ Cryptographic proof via zkTLS

## 🚀 Quick Start

### Install

```bash
npm install ethers
```

### Register & Verify

```typescript
import { VeritasSDK } from './src/sdk';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const sdk = new VeritasSDK({ provider, signer, network: 'sepolia' });

// Complete flow in one call
const { agentId, taskId } = await sdk.registerAndVerify("My Agent", "AI assistant");

// Or step by step:
// Step 1: Register
const agentId = await sdk.registerIdentity("My Agent", "AI assistant");

// Step 2: Build reputation
const taskId = await sdk.requestVerification(agentId, 0);
```

## 📋 Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **IdentityRegistry** | [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://sepolia.basescan.org/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) | Step 1: Register identity |
| **PrimusVeritasApp** | [`0xa70063A1970c9c10d0663610Fe7a02495548ba9b`](https://sepolia.basescan.org/address/0xa70063A1970c9c10d0663610Fe7a02495548ba9b) | Step 2: Build reputation |
| **VeritasValidationRegistry** | [`0x0531Cf433aBc7fA52bdD03B7214d522DAB7Db948`](https://sepolia.basescan.org/address/0x0531Cf433aBc7fA52bdD03B7214d522DAB7Db948) | Validate attestations |
| **ReputationRegistry** | [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://sepolia.basescan.org/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) | Store reputation |

## 🔧 Development

```bash
# Compile contracts
npx hardhat compile

# Deploy to Base Sepolia
npx hardhat run scripts/deploy.js --network baseSepolia

# Test verification
node scripts/test-step2.js
```

## 📁 Project Structure

| File | Description |
|------|-------------|
| `contracts/PrimusVeritasApp.sol` | Main app with agent verification |
| `contracts/VeritasValidationRegistry.sol` | Pure validation logic |
| `contracts/PrimusTaskInterface.sol` | Primus zkTLS interface |
| `src/sdk.ts` | TypeScript SDK |

## 🔗 Links

- **Primus Network**: https://docs.primuslabs.xyz/primus-network/tech-intro
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **ERC-8004 Spec**: https://eips.ethereum.org/EIPS/eip-8004

## 📜 License

MIT
