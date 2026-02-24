# Veritas Protocol

**Cryptographically prove what your AI agent did.**

Veritas combines ERC-8004 agent identity with Primus zkTLS attestations to create verifiable trust for AI agents.

## The Problem

### Trust Crisis in AI Agents

AI agents are increasingly acting autonomously - trading assets, making decisions, and interacting with APIs. But there's a fundamental problem:

**How do you verify what an AI agent actually did?**

An AI trading agent claims:
> "I checked Coinbase and BTC is at $95,000, so I bought."

But:
- Did they actually check Coinbase? 🤷
- Was the price really $95,000? 🤷
- Can they prove it cryptographically? ❌
- Can you verify this later? ❌

### Current State: "Trust Me Bro"

```
┌─────────┐                    ┌─────────┐
│   AI    │  "I fetched BTC    │  User   │
│  Agent  │  price $95,000"    │         │
└─────────┘  ────────────────▶ │ 🤷 OK?  │
                           └─────────┘
                           
No proof. No verification. Just trust.
```

## The Solution

### Veritas Protocol

Veritas replaces trust with cryptographic proof:

```
┌─────────┐                    ┌─────────┐
│   AI    │  zkTLS Proof:      │  User   │
│  Agent  │  BTC = $95,000     │         │
└─────────┘  ────────────────▶ │ ✅ Verify on-chain
                           └─────────┘
                           
Cryptographic proof. Immutable record. Verifiable forever.
```

### How It Works

1. **Agent Identity** - Every agent gets unique on-chain identity (ERC-8004)
2. **zkTLS Attestation** - Primus generates cryptographic proof of API calls
3. **On-Chain Verification** - Proof verified and stored permanently
4. **Reputation Score** - Agent builds verifiable trust history

### What You Can Prove

| API | Example Claim | Veritas Proof |
|-----|---------------|---------------|
| Coinbase | "BTC price is $95,000" | ✅ Cryptographic proof |
| Moltbook | "I have 500 karma" | ✅ Verified on-chain |
| Twitter | "I have 10K followers" | ✅ Attested response |
| Any API | "I fetched this data" | ✅ Immutable record |

## Quick Start

### Install

```bash
git clone https://github.com/xiangxiecrypto/veritas.git
cd veritas
npm install
```

### Configure

```bash
# Set your private key
export PRIVATE_KEY=your_private_key_here

# For protected endpoints (optional)
export MOLTBOOK_API_KEY=your_api_key
```

### Run Tests

```bash
# BTC price validation (public API)
npx hardhat run test/test-btc-sdk.js --network baseSepolia

# Moltbook karma validation (protected API)
npx hardhat run test/test-moltbook-sdk.js --network baseSepolia

# Identity registration
npx hardhat run test/test-identity-registration.js --network baseSepolia
```

## Example: Validate BTC Price

```javascript
const { VeritasSDK } = require('./sdk');

async function validateBTC() {
  // Initialize SDK
  const sdk = new VeritasSDK();
  await sdk.init(signer);
  
  // Register agent (one-time)
  const { agentId } = await sdk.registerAgent();
  
  // Define what to validate (Primus format)
  const request = VeritasSDK.createRequest(
    'https://api.coinbase.com/v2/exchange-rates?currency=BTC'
  );
  
  const responseResolves = VeritasSDK.createResponseResolve(
    'btcPrice',           // Key name
    '$.data.rates.USD'    // JSONPath
  );
  
  // Run validation
  const result = await sdk.validate({
    agentId,
    ruleId: 0,
    checkIds: [0],
    request,
    responseResolves
  });
  
  console.log('Score:', result.score);        // 90
  console.log('Passed:', result.passed);      // true
  console.log('Tx:', result.callbackTxHash);  // 0xabc...
}

validateBTC();
```

**Output:**
```
Agent ID: 1184
Score: 90
Passed: true
Tx: 0xabc123...
BTC Price: $95,234.56
```

## Example: Validate Protected API

For APIs requiring authentication (like Moltbook):

```javascript
const { VeritasSDK } = require('./sdk');

async function validateMoltbook() {
  const sdk = new VeritasSDK();
  await sdk.init(signer);
  
  const { agentId } = await sdk.registerAgent();
  
  // Build request with authentication header
  const request = VeritasSDK.createRequest(
    'https://www.moltbook.com/api/v1/agents/me',
    {
      header: {
        'Authorization': `Bearer ${process.env.MOLTBOOK_API_KEY}`
      }
    }
  );
  
  const responseResolves = VeritasSDK.createResponseResolve(
    'karma',
    '$.agent.karma'
  );
  
  // Validate
  const result = await sdk.validate({
    agentId,
    ruleId: 1,  // Moltbook karma rule
    checkIds: [0],
    request,
    responseResolves
  });
  
  console.log('Karma validated:', result.passed);
  console.log('Score:', result.score);  // 98
}

validateMoltbook();
```

## SDK Reference

### Initialization

```javascript
const sdk = new VeritasSDK({
  appAddress: "0x...",      // Optional: Custom app address
  identityRegistry: "0x...", // Optional: Custom registry
  chainId: 84532            // Optional: Chain ID (default: Base Sepolia)
});

await sdk.init(signer);
```

### Agent Management

```javascript
// Register new agent (auto-assigns ID)
const result = await sdk.registerAgent();
console.log(result.agentId);  // 1184

// Register with metadata URI
const result = await sdk.registerAgent('https://example.com/agent.json');

// Get agent info
const info = await sdk.getAgentInfo(1184);
console.log(info.registered);      // true
console.log(info.owner);           // 0x...
console.log(info.validationCount); // 5
```

### Validation

```javascript
// Create request (Primus SDK format)
const request = VeritasSDK.createRequest(
  'https://api.example.com/data',
  {
    method: 'GET',           // Optional: default GET
    header: {                // Optional: custom headers
      'Authorization': 'Bearer token'
    }
  }
);

// Create response resolve (Primus SDK format)
const responseResolves = VeritasSDK.createResponseResolve(
  'value',           // keyName
  '$.data.value',    // JSONPath
  'json'             // parseType (optional)
);

// Validate
const result = await sdk.validate({
  agentId: 1184,      // Required: Agent ID
  ruleId: 0,          // Required: Rule to use
  checkIds: [0],      // Required: Checks to run
  request,            // Required: Request config
  responseResolves,   // Required: Response config
  fee: '0.00000001'   // Optional: Fee in ETH
});

// Result
console.log(result.success);         // true
console.log(result.taskId);          // 0x...
console.log(result.requestTxHash);   // 0x...
console.log(result.callbackTxHash);  // 0x...
console.log(result.data);            // {"btcPrice":"95234.56"}
console.log(result.score);           // 90
console.log(result.passed);          // true
```

### Rule Management

```javascript
// Get all rules
const rules = await sdk.getAllRules();
// [{ruleId: 0, url: '...', dataKey: '...', ...}]

// Get specific rule
const rule = await sdk.getRule(0);
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

1. **Register** - Agent gets on-chain identity
2. **Request** - Submit validation request
3. **Attest** - Primus generates zkTLS proof
4. **Verify** - On-chain verification
5. **Store** - Immutable record + reputation update

## Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| PrimusVeritasApp | `0xC34E7059e1E891a4c42F9232D0162dCab92Fa0ec` | Main validation contract |
| SimpleVerificationCheck | `0xb8F13205a0f7754A5EFeb11a6B159F0d8C70ef55` | Generic URL validation |
| MoltbookKarmaCheck | `0x7BDFd547dc461932f9feeD0b52231E76bbFc52C8` | Moltbook karma validation |
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | ERC-8004 agent identity |
| ValidationRegistry | `0xAeFdE0707014b6540128d3835126b53F073fEd40` | Validation history |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Reputation scores |

## Use Cases

### 1. DeFi Protocols

**Problem:** Trading agents claim prices without proof

**Solution:**
```javascript
// Agent proves price fetch
const result = await sdk.validate({
  agentId,
  ruleId: 0,  // BTC price rule
  request: VeritasSDK.createRequest('https://api.coinbase.com/...'),
  responseResolves: VeritasSDK.createResponseResolve('price', '$.data.rates.USD')
});

// Protocol verifies on-chain
if (result.passed && result.score >= 90) {
  executeTrade();
}
```

### 2. AI Marketplaces

**Problem:** Buyers can't verify agent trustworthiness

**Solution:**
```javascript
// Check agent reputation
const info = await sdk.getAgentInfo(agentId);

if (info.validationCount > 100) {
  // Agent has 100+ verified actions
  // Safe to hire
}
```

### 3. Compliance

**Problem:** Regulators need audit trail

**Solution:**
```javascript
// Every validation stored permanently
// Query validation history
const history = await sdk.getValidationHistory(agentId);

// Immutable proof of:
// - What was checked
// - When it was checked
// - What the result was
```

## Custom Checks

Create your own validation logic:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ICustomCheck.sol";

contract ThresholdCheck is ICustomCheck {
    function validate(
        bytes calldata request,
        bytes calldata responseResolve,
        bytes calldata attestationData,
        string calldata url,
        string calldata dataKey,
        string calldata parsePath,
        bytes calldata params
    ) external pure override returns (bool) {
        // Decode threshold from params
        uint256 threshold = abi.decode(params, (uint256));
        
        // Parse value from attestation
        uint256 value = parseValue(attestationData, dataKey);
        
        return value >= threshold;
    }
}
```

See [CUSTOM_CHECK_DESIGN.md](./docs/CUSTOM_CHECK_DESIGN.md) for details.

## Project Structure

```
veritas/
├── sdk/
│   ├── VeritasSDK.js      # Main SDK
│   └── index.js
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
    ├── PROTOCOL_DESIGN.md
    ├── WORKFLOW.md
    ├── ARCHITECTURE.md
    └── CUSTOM_CHECK_DESIGN.md
```

## Documentation

- [Protocol Design](./docs/PROTOCOL_DESIGN.md) - Problem, solution, use cases
- [Workflow](./docs/WORKFLOW.md) - Step-by-step guide
- [Architecture](./docs/ARCHITECTURE.md) - System overview
- [Custom Checks](./docs/CUSTOM_CHECK_DESIGN.md) - Create custom validation

## Links

- [Primus Network](https://primuslab.org/) - zkTLS attestation infrastructure
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Agent identity standard
- [Base Sepolia Explorer](https://sepolia.basescan.org/)

## License

MIT
