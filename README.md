# Veritas Protocol

> **Verifiable Truth for the Agentic Economy**

Veritas Protocol enables AI agents to **cryptographically prove their activities**—trades, computations, data fetches, service deliveries—creating an immutable record of verifiable work on-chain.

## 🚀 The Problem

AI agents are becoming autonomous economic actors:
- Trading billions in DeFi
- Running complex computations
- Fetching critical data for smart contracts
- Providing services to users

**But how do you verify an AI actually did what it claims?**

Traditional approaches fail:
- ❌ Self-reported logs (easily faked)
- ❌ Centralized audits (expensive, slow)
- ❌ Social proofs (unreliable)

```
┌─────────┐                    ┌─────────┐
│   AI    │  "I executed the   │  User   │
│  Agent  │   trade at $95K"   │         │
└─────────┘  ────────────────▶ │ 🤷 Trust me? │
                           
No proof. No verification. Just hope.
```

## 💡 The Solution

Veritas provides **cryptographic proof of agent activities** through a seamless, **fully customizable** three-layer stack:

> **"If you can fetch it from an API, you can prove it on-chain."**

Define your own rules. Create your own checks. Prove any activity.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VERITAS PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │    Activity     │   │   Validation    │   │  Verification   │   │
│  │    Recording    │   │    (Primus)     │   │    (On-Chain)   │   │
│  │                 │   │                 │   │                 │   │
│  │ • Agent Registry│   │ • zkTLS Proofs  │   │ • Proof Storage │   │
│  │ • Metadata      │   │ • API Attests   │   │ • Score Calc    │   │
│  │ • Ownership     │   │ • Auto-Callback │   │ • Queryable     │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
│                                                                      │
│           ▼                    ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │     "Prove any agent activity,                               │   │
│  │      store it on-chain,                                      │   │
│  │      query it forever"                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## ✨ What You Can Prove

**Literally anything an AI agent does.** If it can be fetched from an API, Veritas can prove it.

### 📊 Trading Activity

```solidity
// Prove an AI agent executed a trade on Coinbase
app.addRule(
    "https://api.exchange.coinbase.com/orders/{orderId}",
    "filled_size",
    "$.filled_size",
    8,    // decimals
    300,  // max age 5 min
    "Trade Execution Proof"
);

// Result: Cryptographic proof that order was filled
// Stored on-chain, verifiable forever
```

### 🔮 Oracle Data

```solidity
// Prove price data came from Binance at specific time
app.addRule(
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
    "price",
    "$.price",
    2,    // decimals
    60,   // 1 minute freshness
    "Binance BTC Price"
);

// Result: zkTLS proof of price at timestamp
// DeFi protocols can verify before using
```

### 🖥 Computation Results

```solidity
// Prove ML inference was run on specific data
app.addRule(
    "https://ml-service.com/inference/{jobId}",
    "prediction",
    "$.result.prediction",
    6,    // decimals
    600,  // max age 10 min
    "ML Inference Result"
);

// Result: Proof that model produced specific output
// Audit trail for AI decisions
```

### 🛠 Service Delivery

```solidity
// Prove API service responded correctly
app.addRule(
    "https://api.service.com/health",
    "status",
    "$.status",
    0,    // decimals
    30,   // max age 30 sec
    "Service Health Check"
);

// Result: Uptime proof for SLA enforcement
```

## 🔧 Fully Customizable Rules & Checks

**Veritas is designed for maximum flexibility.** Define your own validation rules and create custom check logic for any use case.

### Custom Rules

Rules define **what** to validate from API responses:

```solidity
// Define any API endpoint
app.addRule(
    "https://your-api.com/endpoint",  // Any API URL
    "value",                           // Data key to extract
    "$.path.to.value",                 // JSONPath expression
    decimals,                          // Precision
    maxAge,                            // Freshness requirement
    "Description"                      // Human-readable description
);
```

**Rule Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `url` | string | API endpoint | `"https://api.coinbase.com/..."` |
| `dataKey` | string | Key name for extraction | `"btcPrice"` |
| `parsePath` | string | JSONPath to value | `"$.data.rates.USD"` |
| `decimals` | uint8 | Decimal precision | `8` (for BTC) |
| `maxAge` | uint256 | Max age in seconds | `3600` (1 hour) |
| `description` | string | Human-readable label | `"Coinbase BTC Price"` |

### Custom Checks

Checks define **how** to validate the extracted data. Create your own validation logic:

```solidity
// Example: Threshold Check - Verify value meets minimum
contract ThresholdCheck is ICustomCheck {
    function validate(
        bytes calldata request,
        bytes calldata responseResolve,
        bytes calldata attestationData,
        string calldata url,
        string calldata dataKey,
        string calldata parsePath,
        bytes calldata params  // Custom parameters!
    ) external pure override returns (bool) {
        // Decode your custom params
        uint256 threshold = abi.decode(params, (uint256));
        
        // Extract value from attestation
        uint256 value = extractValue(attestationData, dataKey);
        
        // Your validation logic
        return value >= threshold;
    }
}
```

### Check Examples

| Check Type | Use Case | Logic |
|------------|----------|-------|
| **SimpleVerificationCheck** | Basic validation | Verify URL, dataKey, parsePath match |
| **ThresholdCheck** | Minimum values | Verify `value >= threshold` |
| **RangeCheck** | Price bounds | Verify `min <= value <= max` |
| **WhitelistCheck** | Allowed addresses | Verify address in whitelist |
| **MoltbookKarmaCheck** | Reputation | Verify `karma > 0` |
| **FollowerCheck** | Social proof | Verify `followers >= minFollowers` |

### Adding Custom Checks

```javascript
// Deploy your check contract
const ThresholdCheck = await ethers.getContractFactory("ThresholdCheck");
const check = await ThresholdCheck.deploy();
await check.deployed();

// Add to rule with custom params
const params = ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    [1000]  // Minimum threshold
);

await app.addCheck(
    ruleId,          // Rule to attach to
    check.address,   // Your check contract
    params,          // Custom parameters
    90               // Score weight
);
```

### Combining Multiple Checks

Rules can have multiple checks for comprehensive validation:

```solidity
// Rule: Price must be from trusted source AND within range
app.addCheck(0, urlMatchCheck, "0x", 50);      // 50 points for URL match
app.addCheck(0, rangeCheck, rangeParams, 30);  // 30 points for range
app.addCheck(0, freshnessCheck, "0x", 20);     // 20 points for freshness

// Total: 100 points if all pass
```

### Why Customizable?

**Different use cases need different validation:**

```
DeFi Protocol:      "Price must be from Binance AND within 1% of median"
AI Marketplace:     "Agent must have 100+ karma AND completed 50 tasks"
Compliance:         "KYC verified AND jurisdiction in whitelist"
Service Provider:   "Response time < 100ms AND 99.9% uptime"
```

**With Veritas, you define the rules.** See [CUSTOM_CHECK_DESIGN.md](./docs/CUSTOM_CHECK_DESIGN.md) for complete guide.

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
```

### Run Your First Proof

```bash
# Prove BTC price from Coinbase
npx hardhat run test/test-btc-sdk.js --network baseSepolia
```

**Output:**
```
✅ Agent registered: 1184
✅ Validation complete!
   Score: 90/100
   BTC Price: $95,234.56
   Proof Tx: 0xabc123...
   
🔍 Verify: https://sepolia.basescan.org/tx/0xabc123...
```

## Code Example: Prove Any API

```javascript
const { VeritasSDK } = require('./sdk');

async function proveActivity() {
  // 1. Initialize
  const sdk = new VeritasSDK();
  await sdk.init(signer);
  
  // 2. Get agent identity
  const { agentId } = await sdk.registerAgent();
  
  // 3. Define what to prove
  const request = VeritasSDK.createRequest(
    'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
  );
  
  const responseResolves = VeritasSDK.createResponseResolve(
    'price',
    '$.price'
  );
  
  // 4. Generate cryptographic proof
  const result = await sdk.validate({
    agentId,
    ruleId: 0,
    checkIds: [0],
    request,
    responseResolves
  });
  
  // 5. Immutable on-chain record
  console.log('✅ Proven on-chain!');
  console.log('   Score:', result.score);
  console.log('   Proof:', result.callbackTxHash);
}

proveActivity();
```

## Protected APIs (With Authentication)

Prove data from authenticated endpoints:

```javascript
// Example: Prove Moltbook karma
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

const result = await sdk.validate({
  agentId,
  ruleId: 1,
  checkIds: [0],
  request,
  responseResolves
});

console.log('Karma:', result.data.karma);
console.log('Proof:', result.callbackTxHash);
```

## SDK Reference

### Initialize

```javascript
const sdk = new VeritasSDK();
await sdk.init(signer);
```

### Agent Identity

```javascript
// Register new agent
const { agentId } = await sdk.registerAgent();

// Register with metadata
const { agentId } = await sdk.registerAgent('https://metadata.uri');

// Get agent info
const info = await sdk.getAgentInfo(agentId);
```

### Prove Activity

```javascript
// Create request (Primus SDK format)
const request = VeritasSDK.createRequest(url, options?);

// Define extraction
const responseResolves = VeritasSDK.createResponseResolve(
  keyName,
  jsonPath
);

// Validate
const result = await sdk.validate({
  agentId,
  ruleId,
  checkIds,
  request,
  responseResolves
});
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

**Flow:**
1. **Agent Identity** - ERC-8004 on-chain identity
2. **zkTLS Attestation** - Primus cryptographic proof
3. **Custom Validation** - Your rules, your checks
4. **On-Chain Storage** - Immutable, queryable forever

## Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| PrimusVeritasApp | `0xC34E7059e1E891a4c42F9232D0162dCab92Fa0ec` | Main validation contract |
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | ERC-8004 agent identity |
| ValidationRegistry | `0xAeFdE0707014b6540128d3835126b53F073fEd40` | Proof storage |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Reputation scores |

## Custom Validation Rules

Create your own validation logic:

```solidity
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
        uint256 threshold = abi.decode(params, (uint256));
        uint256 value = parseValue(attestationData, dataKey);
        return value >= threshold;
    }
}
```

See [CUSTOM_CHECK_DESIGN.md](./docs/CUSTOM_CHECK_DESIGN.md) for details.

## Use Cases

### DeFi Protocols
**Problem:** Trading agents claim prices without proof

**Solution:** Verifiable price attestations
```javascript
// Agent proves price fetch
const result = await sdk.validate({ ... });

// Protocol verifies on-chain
if (result.passed && result.score >= 90) {
  executeTrade(); // Safe to execute
}
```

### AI Marketplaces
**Problem:** Buyers can't verify agent reputation

**Solution:** On-chain activity history
```javascript
const info = await sdk.getAgentInfo(agentId);
// info.validationCount = 500+ verified actions
// Safe to hire
```

### Compliance & Auditing
**Problem:** Regulators need audit trail

**Solution:** Immutable proof history
```javascript
const history = await sdk.getValidationHistory(agentId);
// Every action: proven, timestamped, queryable
```

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

- 📖 [Protocol Design](./docs/PROTOCOL_DESIGN.md) - Problem, solution, use cases
- 🚀 [Workflow](./docs/WORKFLOW.md) - Step-by-step guide
- 🏗 [Architecture](./docs/ARCHITECTURE.md) - System overview
- 🔧 [Custom Checks](./docs/CUSTOM_CHECK_DESIGN.md) - Create validation logic

## Links

- [Primus Network](https://docs.primuslabs.xyz/primus-network/understand-primus-network) - zkTLS attestation infrastructure
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Agent identity standard
- [Base Sepolia Explorer](https://sepolia.basescan.org/)

## License

MIT

---

> **"Prove any agent activity, store it on-chain, query it forever"**
