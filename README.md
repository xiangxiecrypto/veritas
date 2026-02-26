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

### 1. Deploy Contracts

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

This will deploy:
- RuleRegistry
- VeritasValidator
- HTTPCheck
- JSONPathCheck

### 2. Create Rules

```bash
npx hardhat run scripts/create-rules.js --network baseSepolia
```

### 3. Run Tests

```bash
# Set environment variables
export PRIMUS_APP_ID="your_app_id"
export PRIMUS_APP_SECRET="your_app_secret"
export VALIDATOR_ADDRESS="deployed_validator_address"

# Run integration test
npx hardhat run test/run-integration-test.ts --network baseSepolia
```

## SDK Usage

### Initialize

```typescript
import { NeatVeritasSDK } from './src/sdk';
import { ethers } from 'ethers';

// Note: Validator address is hardcoded in the SDK
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

## Contracts

| Contract | Description |
|----------|-------------|
| `RuleRegistry` | Stores validation rules |
| `VeritasValidator` | Main validation contract |
| `HTTPCheck` | Basic HTTP validation |
| `JSONPathCheck` | Advanced JSON path validation |

## Deployed Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| RuleRegistry | `0xA03F539830fD53A7E1345b2BC815f3A66e19bC35` |
| VeritasValidator | `0xca215CAaDa2d446481466b3D55eb152426065f9A` |
| HTTPCheck | `0xD3a3fA724C2436792a647528fb32fd38b7E94083` |
| JSONPathCheck | `0x2E68F81b23cA61DFC251205283B7217654D73859` |

## License

MIT
