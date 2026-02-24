# Veritas Protocol

**Build verifiable trust for AI agents with ERC-8004 and Primus zkTLS.**

Veritas combines ERC-8004 agent identity with Primus zkTLS attestations to create cryptographically verifiable reputation for AI agents.

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# BTC price validation (public API - no auth needed)
npx hardhat run test/test-btc-sdk.js --network baseSepolia

# Moltbook karma validation (requires API key)
export MOLTBOOK_API_KEY=your_api_key
npx hardhat run test/test-moltbook-sdk.js --network baseSepolia

# Identity registration
npx hardhat run test/test-identity-registration.js --network baseSepolia
```

## SDK Usage

### Initialize

```javascript
const { VeritasSDK } = require('./sdk');

const sdk = new VeritasSDK();
await sdk.init(signer);
```

### Register Agent

```javascript
// Auto-assigns agent ID
const result = await sdk.registerAgent();
console.log('Agent ID:', result.agentId);

// With metadata URI
const result = await sdk.registerAgent('https://example.com/agent.json');
```

### Validate (Generic)

The SDK uses Primus-style `request` and `responseResolves` for maximum flexibility:

```javascript
// Create request (Primus format)
const request = VeritasSDK.createRequest(
  'https://api.example.com/data',
  { header: { 'Authorization': 'Bearer token' } }
);

// Create response resolve (Primus format)
const responseResolves = VeritasSDK.createResponseResolve(
  'value',           // keyName
  '$.data.value',    // parsePath (JSONPath)
  'json'             // parseType (optional, default: 'json')
);

// Validate
const result = await sdk.validate({
  agentId: result.agentId,
  ruleId: 0,
  checkIds: [0],
  request,
  responseResolves
});

console.log('Score:', result.score);
console.log('Passed:', result.passed);
```

### Full Example: Moltbook Karma Validation

```javascript
const { VeritasSDK } = require('./sdk');
const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  // Initialize SDK
  const sdk = new VeritasSDK();
  await sdk.init(signer);
  
  // Register agent
  const { agentId } = await sdk.registerAgent();
  console.log('Agent ID:', agentId);
  
  // Build request with authentication
  const request = VeritasSDK.createRequest(
    'https://www.moltbook.com/api/v1/agents/me',
    { 
      header: { 
        'Authorization': `Bearer ${process.env.MOLTBOOK_API_KEY}` 
      } 
    }
  );
  
  // Define what to extract
  const responseResolves = VeritasSDK.createResponseResolve(
    'karma',           // keyName
    '$.agent.karma'    // JSONPath
  );
  
  // Run validation
  const result = await sdk.validate({
    agentId,
    ruleId: 1,         // Moltbook karma rule
    checkIds: [0],
    request,
    responseResolves
  });
  
  console.log('Success:', result.success);
  console.log('Score:', result.score);
  console.log('Tx:', result.callbackTxHash);
}

main();
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   VeritasSDK    │────▶│ PrimusVeritasApp │────▶│ ReputationRegistry │
│  (TypeScript)   │     │   (Solidity)     │     │    (ERC-8004)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Primus SDK     │     │  Custom Checks   │     │ ValidationRegistry│
│   (zkTLS)       │     │  (Solidity)      │     │    (Storage)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Flow

1. **Register Agent** - Get unique on-chain identity (ERC-8004)
2. **Request Validation** - Submit validation request to PrimusVeritasApp
3. **Primus Attestation** - zkTLS proof generated off-chain
4. **Auto-Callback** - Verification results posted on-chain
5. **Reputation Update** - Score added to agent's reputation

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| PrimusVeritasApp | `0xC34E7059e1E891a4c42F9232D0162dCab92Fa0ec` |
| SimpleVerificationCheck | `0xb8F13205a0f7754A5EFeb11a6B159F0d8C70ef55` |
| MoltbookKarmaCheck | `0x7BDFd547dc461932f9feeD0b52231E76bbFc52C8` |
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ValidationRegistry | `0xAeFdE0707014b6540128d3835126b53F073fEd40` |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

## Custom Checks

Create custom validation checks by implementing `ICustomCheck`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICustomCheck {
    function validate(
        bytes calldata request,
        bytes calldata responseResolve,
        bytes calldata attestationData,
        string calldata url,
        string calldata dataKey,
        string calldata parsePath,
        bytes calldata params
    ) external returns (bool);
}
```

Example: [MoltbookKarmaCheck.sol](./contracts/checks/MoltbookKarmaCheck.sol)

## Project Structure

```
├── sdk/
│   ├── VeritasSDK.js      # Main SDK class
│   └── index.js           # Exports
├── contracts/
│   ├── PrimusVeritasApp.sol
│   ├── ICustomCheck.sol
│   └── checks/
│       ├── SimpleVerificationCheck.sol
│       └── MoltbookKarmaCheck.sol
├── test/
│   ├── test-btc-sdk.js
│   ├── test-moltbook-sdk.js
│   └── test-identity-registration.js
├── scripts/
│   ├── deploy.js
│   └── setup-rules.js
└── docs/
    └── *.md
```

## Configuration

### Environment Variables

```bash
# For Moltbook protected endpoint tests
export MOLTBOOK_API_KEY=your_api_key
```

### Hardhat Config

Update `hardhat.config.js` with your network settings:

```javascript
module.exports = {
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

## Links

- [Primus Network](https://primuslab.org/)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Base Sepolia Explorer](https://sepolia.basescan.org/)

## License

MIT
