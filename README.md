# Veritas Protocol - Verification Layer

**Cryptographic Verification for AI Agent Commerce**

A minimal verification protocol using zktls-core-sdk for direct TLS attestations.

## 🎯 What is Veritas?

Veritas is a **verification layer** that provides cryptographic proof of API calls and data authenticity. It does NOT handle:

- ❌ Job management
- ❌ Payment escrow
- ❌ Business logic

These are handled by **ACP (Agent Commerce Protocol)** or other commercial layers.

## 📋 Architecture

```
┌─────────────────────────────────────────────────────┐
│          Commercial Layer (ACP or others)           │
│  Jobs, Payments, SLA, Dispute Resolution            │
└────────────────────┬────────────────────────────────┘
                     │ Calls Veritas for verification
┌────────────────────▼────────────────────────────────┐
│          Veritas Verification Layer                 │
│  ┌──────────────┐  ┌──────────────┐               │
│  │RuleRegistry  │  │Check Contracts│               │
│  └──────┬───────┘  └──────┬───────┘               │
│         └─────────────────┤                        │
│                   ┌──────▼───────┐                │
│                   │VeritasValidator│              │
│                   └──────┬───────┘                │
└──────────────────────────┼─────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────┐
│          zktls-core-sdk                            │
│  • Local proof generation                          │
│  • No network dependencies                         │
└────────────────────────────────────────────────────┘
```

## 🔄 How It Works

### 1. Setup (One-time)
```typescript
// Deploy contracts
const ruleRegistry = await RuleRegistry.deploy();
const validator = await VeritasValidator.deploy(ruleRegistry.address);

// Create a rule
await ruleRegistry.createRule(
  'API Verification',
  'Verify API calls',
  httpCheckAddress,
  checkData,
  80  // required score
);
```

### 2. Generate Proof (Agent side)
```typescript
import { VeritasSDK } from '@veritas/sdk';

const veritas = new VeritasSDK({ signer: wallet });

// Execute API and generate proof
const result = await veritas.executeWithProof({
  url: 'https://api.example.com/data',
  method: 'POST',
  body: { query: 'test' }
});

// result contains:
// - attestation: cryptographic proof
// - responseData: API response
// - attestationHash: unique identifier
```

### 3. Verify On-Chain (ACP side)
```typescript
// ACP calls Veritas to verify
const validationResult = await veritas.validateAttestation(
  validatorAddress,
  result.attestation,
  ruleId,
  result.responseData
);

// validationResult contains:
// - passed: true/false
// - score: 0-100
// - attestationHash: on-chain reference

// ACP decides what to do based on result
if (validationResult.passed && validationResult.score >= 80) {
  // Release payment, mark job as complete, etc.
} else {
  // Reject result, initiate dispute, etc.
}
```

## 🚀 Quick Start

### Install

```bash
npm install
```

### Compile

```bash
npm run compile
```

### Test

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

### SDK

```typescript
import { VeritasSDK } from '@veritas/sdk';

const veritas = new VeritasSDK({ signer: wallet });

// Generate proof
const result = await veritas.executeWithProof({
  url: 'https://api.example.com/data',
  method: 'GET'
});

// Verify on-chain
const validation = await veritas.validateAttestation(
  validatorAddress,
  result.attestation,
  ruleId,
  result.responseData
);
```

## 🔗 Integration with ACP

Veritas is designed to work with Agent Commerce Protocol (ACP):

```typescript
// ACP workflow with Veritas verification

// 1. ACP creates job
const job = await acp.createJob({ /* ... */ });

// 2. Agent executes and generates proof
const proof = await veritas.executeWithProof(apiRequest);

// 3. ACP verifies proof before releasing payment
const validation = await veritas.validateAttestation(
  validatorAddress,
  proof.attestation,
  job.ruleId,
  proof.responseData
);

// 4. ACP acts based on verification result
if (validation.passed) {
  await acp.releasePayment(job.id);
} else {
  await acp.rejectResult(job.id);
}
```

## 🎨 What Veritas Provides

✅ **Cryptographic Proof** - zktls-core-sdk attestations  
✅ **On-Chain Verification** - Immutable validation records  
✅ **Flexible Rules** - Customizable check logic  
✅ **Score System** - 0-100 quality metrics  

## 🚫 What Veritas Does NOT Provide

❌ **Job Management** - No job creation/tracking  
❌ **Payment Handling** - No escrow or funds  
❌ **Dispute Resolution** - No arbitration  
❌ **SLA Management** - No deadlines or penalties  

These are provided by ACP or other commercial layers.

## 📊 Gas Costs

| Operation | Gas Used | Cost (Base Sepolia) |
|-----------|----------|---------------------|
| Deploy RuleRegistry | ~800,000 | ~$0.012 |
| Deploy VeritasValidator | ~600,000 | ~$0.009 |
| Create Rule | ~100,000 | ~$0.0015 |
| Validate Attestation | ~50,000 | ~$0.0008 |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run specific test
npx hardhat test test/VeritasProtocol.test.ts
```

## 📖 API Reference

### VeritasSDK

```typescript
class VeritasSDK {
  // Generate proof from API call
  async executeWithProof(request: APIRequest): Promise<AttestationResult>
  
  // Verify attestation locally
  async verifyAttestation(attestation: string): Promise<boolean>
  
  // Validate attestation on-chain
  async validateAttestation(
    validatorAddress: string,
    attestation: string,
    ruleId: number,
    responseData: any
  ): Promise<ValidationResult>
  
  // Get validation result from blockchain
  async getValidationResult(
    validatorAddress: string,
    attestationHash: string
  ): Promise<ValidationResult>
  
  // Check if attestation is validated
  async isValidated(
    validatorAddress: string,
    attestationHash: string
  ): Promise<boolean>
}
```

### Smart Contracts

#### RuleRegistry

```solidity
// Create a new rule
function createRule(
  string name,
  string description,
  address checkContract,
  bytes checkData,
  uint256 requiredScore
) returns (uint256 ruleId)

// Get rule details
function getRule(uint256 ruleId) returns (Rule)

// Update rule status
function updateRuleStatus(uint256 ruleId, bool active)
```

#### VeritasValidator

```solidity
// Validate an attestation
function validate(
  bytes attestation,
  uint256 ruleId,
  bytes responseData
) returns (bool passed, uint256 score, bytes32 attestationHash)

// Get validation result
function getValidationResult(bytes32 attestationHash) returns (
  uint256 ruleId,
  bool passed,
  uint256 score,
  uint256 timestamp
)

// Check if validated
function isValidated(bytes32 attestationHash) returns (bool)
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
  'API Verification',
  'Verify API calls',
  httpCheckAddress,
  checkData,
  80  // required score
);
```

## 📝 Examples

See `/examples` directory for:
- Basic verification flow
- ACP integration patterns
- Custom check contracts
- Multi-rule scenarios

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE).

## 🙏 Acknowledgments

- [Primus Labs](https://primuslabs.xyz) for zktls-core-sdk
- [OpenZeppelin](https://openzeppelin.com) for secure contract libraries
- [Virtuals Protocol](https://virtuals.io) for ACP inspiration

---

**Veritas = Truth. Simple verification for the AI Agent Economy.**
