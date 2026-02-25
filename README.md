# Veritas Protocol - Binary Verification Layer

**Cryptographic Verification for AI Agent Commerce**

A minimal verification protocol using zktls-core-sdk for direct TLS attestations.

## 🎯 What is Veritas?

Veritas is a **verification layer** that provides cryptographic proof of API calls and data authenticity with **binary validation results only**.

### ✅ What Veritas Does
- Generate cryptographic proof of API calls
- Validate proofs on-chain
- Return **passed (true/false)** result
- Simple, minimal, focused

### ❌ What Veritas Does NOT Do
- Job management (ACP's job)
- Payment escrow (ACP's job)
- Score calculation (removed)
- Threshold checking (removed)
- Any business logic (ACP's job)

## 📋 Architecture

```
┌─────────────────────────────────────────────────────┐
│          Commercial Layer (ACP or others)           │
│  Jobs, Payments, SLA, Dispute Resolution            │
└────────────────────┬────────────────────────────────┘
                     │ Calls Veritas for verification
┌────────────────────▼────────────────────────────────┐
│          Veritas Verification Layer                 │
│                                                      │
│  Input:  API Request + zktls Attestation           │
│  Output: passed (true/false)                        │
│                                                      │
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

// Create a rule (no score requirement)
await ruleRegistry.createRule(
  'API Verification',
  'Verify API calls',
  httpCheckAddress,
  checkData
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
const validation = await veritas.validateAttestation(
  validatorAddress,
  result.attestation,
  ruleId,
  result.responseData
);

// validation contains ONLY:
// - passed: true/false (binary result)
// - ruleId: which rule was used
// - timestamp: when validated
// - attestationHash: on-chain reference

// ACP decides what to do based on binary result
if (validation.passed) {
  // Verification passed
  // Release payment, mark job as complete, etc.
} else {
  // Verification failed
  // Reject result, initiate dispute, etc.
}
```

## 🎯 Key Concept: Binary Validation

**Veritas returns ONLY passed (true/false)**

```solidity
function validate(
    bytes calldata attestation,
    uint256 ruleId,
    bytes calldata responseData
) external returns (bool passed, bytes32 attestationHash)
```

**No score. No threshold. No complexity.**

Just a simple yes/no answer.

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

| Contract | Description | Output |
|----------|-------------|--------|
| **RuleRegistry** | Manages validation rules | - |
| **VeritasValidator** | Validates attestations | `passed: bool` |
| **HTTPCheck** | HTTP API verification | `passed: bool` |

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

console.log(validation.passed); // true or false
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

// 4. ACP acts based on binary verification result
if (validation.passed) {
  // Verification passed - release payment
  await acp.releasePayment(job.id);
} else {
  // Verification failed - reject result
  await acp.rejectResult(job.id);
}
```

## 🎨 What Veritas Provides

✅ **Cryptographic Proof** - zktls-core-sdk attestations  
✅ **On-Chain Verification** - Immutable validation records  
✅ **Binary Result** - passed (true/false)  
✅ **Flexible Rules** - Customizable check logic  

## 🚫 What Veritas Does NOT Provide

❌ **Score System** - No 0-100 metrics  
❌ **Threshold Checking** - No minimum score  
❌ **Job Management** - No job creation/tracking  
❌ **Payment Handling** - No escrow or funds  
❌ **Dispute Resolution** - No arbitration  
❌ **SLA Management** - No deadlines or penalties  

These are provided by ACP or other commercial layers.

## 📊 Gas Costs

| Operation | Gas Used | Cost (Base Sepolia) |
|-----------|----------|---------------------|
| Deploy RuleRegistry | ~750,000 | ~$0.011 |
| Deploy VeritasValidator | ~550,000 | ~$0.008 |
| Create Rule | ~90,000 | ~$0.0014 |
| Validate Attestation | ~40,000 | ~$0.0006 |

**Simplified validation = Lower gas costs**

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
  
  // Validate attestation on-chain (returns passed: true/false)
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

### ValidationResult

```typescript
interface ValidationResult {
  passed: boolean;          // Binary result: true/false
  ruleId: number;           // Rule used for validation
  timestamp: number;        // When validated
  attestationHash: string;  // On-chain reference
}
```

### Smart Contracts

#### RuleRegistry

```solidity
// Create a new rule (no score requirement)
function createRule(
  string name,
  string description,
  address checkContract,
  bytes checkData
) returns (uint256 ruleId)

// Get rule details
function getRule(uint256 ruleId) returns (Rule)

// Update rule status
function updateRuleStatus(uint256 ruleId, bool active)
```

#### VeritasValidator

```solidity
// Validate an attestation (binary result only)
function validate(
  bytes attestation,
  uint256 ruleId,
  bytes responseData
) returns (bool passed, bytes32 attestationHash)

// Get validation result
function getValidationResult(bytes32 attestationHash) returns (
  uint256 ruleId,
  bool passed,
  uint256 timestamp
)

// Check if validated
function isValidated(bytes32 attestationHash) returns (bool)
```

#### ICheck

```solidity
// Check contract interface (returns bool only)
function validate(
  bytes attestation,
  bytes checkData,
  bytes responseData
) returns (bool passed)
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
  checkData
  // No score requirement
);
```

## 💡 Philosophy

**Keep it simple:**

1. **Generate proof** - zktls-core-sdk
2. **Validate proof** - VeritasValidator
3. **Return result** - passed (true/false)

**That's it.**

No scores. No thresholds. No complexity.

Just cryptographic proof + binary validation.

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE).

## 🙏 Acknowledgments

- [Primus Labs](https://primuslabs.xyz) for zktls-core-sdk
- [OpenZeppelin](https://openzeppelin.com) for secure contract libraries
- [Virtuals Protocol](https://virtuals.io) for ACP inspiration

---

**Veritas = Truth. Binary verification for the AI Agent Economy.**
