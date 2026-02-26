# NeatVeritasSDK

A TypeScript SDK for generating and verifying API attestations on-chain using Primus ZKTLS.

## Features

- 🔐 **Cryptographic Proof**: Prove any API call happened
- ⛓️ **On-Chain Verification**: Immutable verification records
- 🛠️ **Easy Integration**: Simple TypeScript/JavaScript API
- 🔧 **Customizable**: Pluggable check contracts for different validation logic

## Installation

```bash
npm install @primuslabs/zktls-core-sdk ethers
```

## Quick Start

### 1. Set Environment Variables

```bash
export PRIMUS_APP_ID="your_app_id"
export PRIMUS_APP_SECRET="your_app_secret"
```

### 2. Run Tests

```bash
npx hardhat run test/run-integration-test.ts --network baseSepolia
```

## SDK Usage

### Initialize

```typescript
import { NeatVeritasSDK } from './src/sdk';
import { ethers } from 'ethers';

// Contract addresses are hardcoded in the SDK
const sdk = new NeatVeritasSDK({
  signer: wallet,
  appId: '0x...',
  appSecret: '0x...'
});

await sdk.init();
```

### Generate Attestation

```typescript
const result = await sdk.attest(
  {
    url: 'https://api.example.com/data',
    method: 'GET',
  },
  [
    {
      keyName: 'value',
      parseType: 'string',
      parsePath: '$.data.value',
    },
  ]
);

console.log('Verified:', result.verified);
console.log('Data:', result.responseData);
```

### Validate On-Chain

```typescript
const validation = await sdk.validate(result.attestation, ruleId);

console.log('Passed:', validation.passed);
console.log('Transaction:', validation.transactionHash);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VeritasValidator                              │
│                    (Generic Validator)                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Recipient Check                                              │
│  2. Timestamp Verification (maxAge)                              │
│  3. Primus ZKTLS Signature Verification                          │
│  4. External Check Contract                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ICustomCheck                                  │
│  validate(request, responseResolves, data, checkData)            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │ HTTPCheck  │   │JSONPathCk  │   │ Custom     │
       └────────────┘   └────────────┘   └────────────┘
```

## Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| VeritasValidator | `0xca215CAaDa2d446481466b3D55eb152426065f9A` |
| RuleRegistry | `0xA03F539830fD53A7E1345b2BC815f3A66e19bC35` |
| HTTPCheck | `0xD3a3fA724C2436792a647528fb32fd38b7E94083` |
| JSONPathCheck | `0x2E68F81b23cA61DFC251205283B7217654D73859` |

**Note:** These addresses are hardcoded in the SDK. You don't need to configure them.

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/deploy.js` | Deploy all contracts |
| `scripts/create-rules.js` | Create sample rules |
| `scripts/check-rules.js` | Check rule status |
| `scripts/test-sdk.js` | Full SDK test |
| `scripts/test-eth.js` | ETH price test |

## Running Tests

### Integration Test

```bash
# Set environment variables
export PRIMUS_APP_ID="your_app_id"
export PRIMUS_APP_SECRET="your_app_secret"

# Run test
npx hardhat run test/run-integration-test.ts --network baseSepolia
```

### Unit Tests

```bash
npx hardhat test
```

## Example Output

```
========================================
  NeatVeritasSDK Integration Test
========================================

Configuration:
  App ID: 0xd260f1ace...
  Validator: (hardcoded in SDK)

Signer: 0x89BBf3451643eef216c3A60d5B561c58F0D8adb9

STEP 1: Initialize SDK
----------------------------------------
✅ SDK initialized

STEP 2: Generate Attestation
----------------------------------------
✅ Attestation generated

Result:
  Verified: true
  Data: {"price":"68702.26000000"}
  Timestamp: 2026-02-25T18:10:41.000Z

STEP 3: On-Chain Validation
----------------------------------------
Using Rule ID: 1
✅ Validation complete

Result:
  Passed: true
  Block: 38137406
  Gas Used: 294509

========================================
  ✅ All Tests Passed!
========================================
```

## License

MIT
