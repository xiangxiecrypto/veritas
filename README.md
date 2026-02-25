# Veritas Protocol - Simplified

**Verification Layer for AI Agent Commerce**

A simplified verification protocol using zktls-core-sdk for direct TLS attestations without network SDK dependencies.

## 🎯 Overview

Veritas Protocol provides a trustless verification layer for AI agent transactions. It enables:

- ✅ **Cryptographic Verification** - Using zktls-core-sdk for TLS proof generation
- ✅ **Flexible Rules** - Customizable validation rules and checks
- ✅ **ACP Compatible** - Designed to integrate with Virtuals ACP protocol
- ✅ **Decoupled from 8004** - No EIP-8004 dependencies

## 📋 Architecture

```
┌─────────────────────────────────────────────────────┐
│            Application Layer                        │
│  ┌──────────────┐         ┌──────────────┐        │
│  │ Seller Agent │         │ Buyer Client │        │
│  └──────┬───────┘         └──────┬───────┘        │
└─────────┼────────────────────────┼─────────────────┘
          │                        │
┌─────────▼────────────────────────▼─────────────────┐
│          zktls-core-sdk                            │
│  • Local proof generation                          │
│  • No network dependencies                         │
└──────────────────────┬─────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────┐
│          Blockchain Layer                          │
│  ┌──────────────┐  ┌──────────────┐              │
│  │RuleRegistry  │  │Check Contracts│              │
│  └──────┬───────┘  └──────┬───────┘              │
│         └─────────────────┤                        │
│                   ┌──────▼───────┐                │
│                   │VeritasValidator│              │
│                   └──────┬───────┘                │
│                          │                         │
│                   ┌──────▼───────┐                │
│                   │EnhancedEscrow│                │
│                   └──────────────┘                │
└────────────────────────────────────────────────────┘
```

## 🔄 Workflow

### 1. Setup Phase
- Admin creates Check Contracts
- Admin creates Rules (binds Checks)
- Deploys Validator and Escrow

### 2. Job Creation
- Buyer creates job with Rule ID
- Funds locked in Escrow

### 3. Job Execution
- Seller accepts job
- Executes API call
- Generates attestation using zktls-core-sdk
- Submits result + attestation

### 4. Verification
- Escrow calls VeritasValidator
- Validator calls Check Contract
- Returns verification result

### 5. Settlement
- Buyer confirms job
- Payment released to seller (if verified)

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy

```bash
# Local
npm run deploy

# Base Sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia
```

## 📦 Core Components

### Smart Contracts

| Contract | Description |
|----------|-------------|
| **RuleRegistry** | Manages validation rules |
| **VeritasValidator** | Validates attestations |
| **HTTPCheck** | HTTP API verification |
| **EnhancedEscrow** | Payment escrow with verification |

### SDK

```typescript
import { VeritasSDK } from '@veritas/sdk';

const veritas = new VeritasSDK({
  signer: wallet
});

// Execute API with proof
const result = await veritas.executeWithProof({
  url: 'https://api.example.com/data',
  method: 'POST',
  body: { query: 'test' }
});

// Submit to escrow
await veritas.submitJobResult(
  escrowAddress,
  'job-123',
  result
);
```

## 🔧 Configuration

### Environment Variables

```bash
# .env
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC=https://sepolia.base.org
```

### Create a Rule

```typescript
const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
  ['string', 'string', 'uint256', 'uint256', 'bytes'],
  ['https://api.example.com/*', 'POST', 200, 299, '0x']
);

await ruleRegistry.createRule(
  'API Check',
  'Verify API calls',
  httpCheckAddress,
  checkData,
  80  // required score
);
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test
npx hardhat test test/VeritasProtocol.test.ts

# Run with gas reporting
REPORT_GAS=true npm test
```

## 📊 Gas Costs

| Operation | Gas Used | Cost (Base Sepolia) |
|-----------|----------|---------------------|
| Deploy RuleRegistry | ~800,000 | ~$0.012 |
| Deploy VeritasValidator | ~600,000 | ~$0.009 |
| Deploy EnhancedEscrow | ~1,200,000 | ~$0.018 |
| Create Rule | ~100,000 | ~$0.0015 |
| Create Job | ~150,000 | ~$0.0023 |
| Complete Job | ~200,000 | ~$0.003 |
| Validate Attestation | ~50,000 | ~$0.0008 |

## 🔗 Integration with ACP

Veritas is designed to be compatible with Virtuals ACP protocol:

```typescript
// ACP Job with Veritas verification
const acpJob = await acp.createJob({
  service: 'trading-analysis',
  requirements: { /* ... */ },
  verification: {
    enabled: true,
    validator: veritasValidatorAddress,
    ruleId: 1
  }
});
```

## 📖 Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Integration Guide](./docs/INTEGRATION.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- [Primus Labs](https://primuslabs.xyz) for zktls-core-sdk
- [OpenZeppelin](https://openzeppelin.com) for secure contract libraries
- [Virtuals Protocol](https://virtuals.io) for ACP inspiration

---

**Built with ❤️ for the AI Agent Economy**
