# Veritas Neat

**Binary Verification Layer for AI Agent Commerce**

A minimal, simplified verification protocol using Primus zktls-core-sdk.

---

## 🎯 What is Veritas Neat?

Veritas Neat is a **verification layer** that provides cryptographic proof of API calls.

### ✅ Core Features

- ✅ **Cryptographic Proof** - Using Primus zktls-core-sdk
- ✅ **On-Chain Verification** - Immutable validation records
- ✅ **Binary Result** - Only `passed` (true/false)
- ✅ **Simple & Minimal** - No unnecessary complexity

### ❌ What It Does NOT Do

- ❌ Job management
- ❌ Payment escrow
- ❌ Score calculation
- ❌ Business logic

These are handled by ACP or other commercial layers.

---

## 📦 Installation

```bash
npm install @veritas/neat
```

---

## 🚀 Quick Start

### 1. Setup SDK

```typescript
import { NeatVeritasSDK } from '@veritas/neat';

const neat = new NeatVeritasSDK({
  signer: wallet,
  primusConfig: {
    appId: 'your-primus-app-id',
    appSecret: 'your-primus-app-secret'
  }
});

await neat.init();
```

### 2. Generate Attestation

```typescript
const result = await neat.attest({
  url: 'https://api.example.com/data',
  method: 'GET'
}, [{
  keyName: 'data',
  parseType: 'JSON',
  parsePath: '$.data'
}]);

console.log(result.attestation);  // Cryptographic proof
console.log(result.responseData); // API response
```

### 3. Validate On-Chain

```typescript
const validation = await neat.validateAttestation(
  validatorAddress,
  result.attestation,
  ruleId
);

console.log(validation.passed); // true or false
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│      Commercial Layer (ACP/Other)       │
│   Jobs, Payments, Business Logic        │
└────────────┬────────────────────────────┘
             │ Calls Veritas for verification
┌────────────▼────────────────────────────┐
│      Veritas Neat Verification Layer    │
│                                          │
│  Input:  Attestation + Rule ID          │
│  Output: passed (true/false)            │
│                                          │
│  ┌──────────────┐  ┌──────────────┐    │
│  │RuleRegistry  │  │HTTPCheck     │    │
│  └──────┬───────┘  └──────┬───────┘    │
│         └─────────────────┤            │
│              VeritasValidator           │
└──────────────────────────┼──────────────┘
                           │
              ┌────────────▼────────────┐
              │  Primus zktls-core-sdk  │
              │  Cryptographic Proof    │
              └─────────────────────────┘
```

---

## 🔐 Security Features

### 1. Recipient Verification

Only attestation owner can submit:

```solidity
require(attestation.recipient == msg.sender, "Not your attestation");
```

### 2. ParsePath Validation

Validates data extraction paths:

```typescript
responseResolve: [{
  keyName: 'price',
  parseType: 'JSON',
  parsePath: '$.data.price'  // Must exist in data
}]
```

### 3. Data Integrity

All data comes from attestation (no external parameters).

---

## 📋 Smart Contracts

| Contract | Description |
|----------|-------------|
| **RuleRegistry** | Manages validation rules |
| **VeritasValidator** | Validates attestations |
| **HTTPCheck** | HTTP API verification |

---

## 🎯 Validation Flow

```
1. Generate Attestation (Agent)
   ↓
2. Submit to VeritasValidator (Agent)
   ↓
3. Verify Recipient (Validator)
   ↓
4. Primus Verification (On-chain)
   ↓
5. Custom Check Logic (HTTPCheck)
   ↓
6. Return passed (true/false)
```

---

## 💡 Usage Examples

### Trading API Verification

```typescript
// Create rule for trading API
await ruleRegistry.createRule(
  'Trading API - Orders',
  'Verify order creation',
  httpCheckAddress,
  encodeCheckData({
    expectedUrl: 'https://api.trading.com/orders',
    expectedMethod: 'POST',
    minResponseCode: 200,
    maxResponseCode: 201,
    validateParsePath: true
  })
);

// Agent generates attestation
const attestation = await neat.attest({
  url: 'https://api.trading.com/orders',
  method: 'POST',
  body: { symbol: 'ETH', amount: 100 }
}, [{
  keyName: 'orderId',
  parseType: 'JSON',
  parsePath: '$.data.orderId'
}]);

// Validate
const result = await neat.validateAttestation(
  validatorAddress,
  attestation,
  ruleId
);

if (result.passed) {
  // Verified! Safe to proceed with business logic
}
```

---

## 🔗 Integration with ACP

Veritas Neat is designed to work with Agent Commerce Protocol:

```solidity
contract AgentCommerceProtocol {
    VeritasValidator public validator;
    
    function processJob(
        uint256 jobId,
        Attestation calldata attestation,
        uint256 ruleId
    ) external {
        // Verify attestation
        (bool passed, ) = validator.validate(attestation, ruleId);
        
        if (passed) {
            // Verification successful
            // Safe to release payment
            releasePayment(jobId);
        }
    }
}
```

---

## 📖 Documentation

- [Validation Details](./docs/VALIDATION_DETAILS.md)
- [Security: Recipient Check](./docs/SECURITY_RECIPIENT_CHECK.md)
- [Security: Attestation Data](./docs/SECURITY_ATTESTATION_DATA.md)
- [Primus Integration](./docs/PRIMUS_INTEGRATION.md)
- [Rules Guide](./docs/RULES_GUIDE.md)

---

## 🛠️ Development

### Compile Contracts

```bash
npm install
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

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- [Primus Labs](https://primuslabs.xyz) - zktls-core-sdk
- [OpenZeppelin](https://openzeppelin.com) - Secure contracts
- [Virtuals Protocol](https://virtuals.io) - ACP inspiration

---

**Veritas Neat = Simple Verification** 🎯
