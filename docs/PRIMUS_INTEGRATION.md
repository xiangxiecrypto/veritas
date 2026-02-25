# Primus Integration Guide

This document explains how Veritas Protocol integrates with Primus Labs for on-chain attestation verification.

## 🎯 Overview

Veritas Protocol uses **Primus ZKTLS** for cryptographic verification of attestations on-chain.

### Verification Flow

```
1. Agent executes API call with Primus zktls-core-sdk
2. SDK generates attestation (cryptographic proof)
3. ACP submits attestation to VeritasValidator
4. VeritasValidator:
   a. Calls Primus.verifyAttestation() - verifies cryptographic signature
   b. Executes custom Check logic - validates data content
   c. Returns passed (true/false)
```

## 📦 Installation

### Install Dependencies

```bash
# Install Primus contracts
npm install @primuslabs/zktls-contracts

# Install Primus SDK (for generating attestations)
npm install @primus-labs/zktls-core-sdk

# Install Veritas Protocol
npm install @veritas/protocol
```

### Hardhat Configuration

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  // ... other config
};
```

## 🔧 Smart Contract Integration

### Deploy VeritasValidator

```typescript
import { ethers } from 'hardhat';

// Primus contract addresses
const PRIMUS_ADDRESSES = {
  baseSepolia: '0xC02234058caEaA9416506eABf6Ef3122fCA939E8',
  base: '0x...', // Mainnet address
  ethereum: '0x...', // Ethereum address
};

const network = (await ethers.provider.getNetwork()).name;
const primusAddress = PRIMUS_ADDRESSES[network];

// Deploy VeritasValidator
const VeritasValidator = await ethers.getContractFactory('VeritasValidator');
const validator = await VeritasValidator.deploy(
  ruleRegistryAddress,
  primusAddress
);
```

### Validate Attestation On-Chain

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@primuslabs/zktls-contracts/src/IPrimusZKTLS.sol";
import "@veritas/protocol/contracts/VeritasValidator.sol";

contract MyContract {
    VeritasValidator public validator;
    
    constructor(address _validator) {
        validator = VeritasValidator(_validator);
    }
    
    function verifyAndProcess(
        Attestation calldata attestation,
        uint256 ruleId,
        bytes calldata responseData
    ) external returns (bool) {
        // Validate attestation
        (bool passed, bytes32 attestationHash) = validator.validate(
            attestation,
            ruleId,
            responseData
        );
        
        if (passed) {
            // Process business logic
            // e.g., release payment, mark job complete, etc.
            return true;
        } else {
            // Handle failure
            return false;
        }
    }
}
```

## 🚀 SDK Integration

### Generate Attestation (Agent Side)

```typescript
import { VeritasSDK } from '@veritas/sdk';

const veritas = new VeritasSDK({ signer: wallet });

// Execute API and generate attestation
const result = await veritas.executeWithProof({
  url: 'https://api.example.com/data',
  method: 'POST',
  body: { query: 'test' }
});

// result.attestation contains the cryptographic proof
// result.responseData contains the API response
```

### Submit to Contract (ACP Side)

```typescript
// Validate attestation on-chain
const validation = await veritas.validateAttestation(
  validatorAddress,
  result.attestation,  // Primus attestation
  ruleId,
  result.responseData
);

// validation.passed = true/false
if (validation.passed) {
  // Attestation is valid
  // Primus verified the cryptographic signature
  // Check contract validated the data content
  console.log('✅ Verification passed!');
} else {
  console.log('❌ Verification failed!');
}
```

## 🔍 What Primus Verifies

### 1. Cryptographic Verification

Primus `verifyAttestation()` validates:

- ✅ **Signature Authenticity** - Signed by Primus attestation network
- ✅ **Data Integrity** - Request/response not tampered
- ✅ **TLS Handshake** - Actual TLS connection occurred
- ✅ **Timestamp Validity** - Attestation is recent

### 2. Custom Check Logic

Veritas Check contracts validate:

- ✅ **URL Pattern** - Correct API endpoint
- ✅ **HTTP Method** - Correct method (GET/POST/etc)
- ✅ **Response Code** - Within expected range
- ✅ **Response Content** - Matches expected pattern

## 📊 Primus Contract Addresses

| Network | Address |
|---------|---------|
| **Base Sepolia** | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |
| **Base Mainnet** | TBD |
| **Ethereum Mainnet** | TBD |

## 🔧 Advanced Usage

### Custom Check Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@veritas/protocol/contracts/interfaces/ICheck.sol";

contract CustomCheck is ICheck {
    function validate(
        bytes calldata attestation,
        bytes calldata checkData,
        bytes calldata responseData
    ) external pure override returns (bool passed) {
        // Implement custom validation logic
        // e.g., verify specific data fields, timestamps, etc.
        
        // Decode attestation
        // Parse response data
        // Apply custom rules
        
        return true; // or false
    }
}
```

### Multiple Validation Rules

```typescript
// Create different rules for different scenarios
await ruleRegistry.createRule(
  'Trading API - GET',
  'Verify GET requests to trading API',
  httpCheckAddress,
  encodeCheckData({
    url: 'https://api.trading.com/*',
    method: 'GET',
    minCode: 200,
    maxCode: 299
  })
);

await ruleRegistry.createRule(
  'Trading API - POST',
  'Verify POST requests to trading API',
  httpCheckAddress,
  encodeCheckData({
    url: 'https://api.trading.com/orders',
    method: 'POST',
    minCode: 200,
    maxCode: 201  // Accept 200 or 201
  })
);
```

## 🎯 Best Practices

### 1. Rule Design

- **Be specific** - Define precise URL patterns
- **Set appropriate code ranges** - Don't be too permissive
- **Use multiple rules** - Different rules for different endpoints

### 2. Error Handling

```typescript
try {
  const validation = await veritas.validateAttestation(...);
  
  if (validation.passed) {
    // Success path
  } else {
    // Validation failed
    console.log('Validation failed');
  }
} catch (error) {
  if (error.message.includes('PrimusVerificationFailed')) {
    // Attestation signature invalid
    console.error('Invalid attestation signature');
  } else if (error.message.includes('RuleNotFound')) {
    // Rule doesn't exist
    console.error('Invalid rule ID');
  } else {
    // Other errors
    console.error('Unexpected error:', error);
  }
}
```

### 3. Gas Optimization

- Batch validations when possible
- Use events for off-chain indexing
- Cache validation results

## 🔗 Links

- [Primus Labs Documentation](https://docs.primuslabs.xyz)
- [Primus GitHub](https://github.com/primus-labs)
- [zktls-core-sdk](https://github.com/primus-labs/zktls-core-sdk)
- [zktls-contracts](https://github.com/primus-labs/zktls-contracts)

## 📖 Next Steps

1. Install dependencies
2. Deploy Veritas contracts with Primus address
3. Create validation rules
4. Integrate SDK for attestation generation
5. Submit attestations for on-chain validation

---

**Veritas + Primus = Cryptographic Truth On-Chain** 🔐
