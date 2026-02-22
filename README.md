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

## 💡 The Solution

Veritas provides **cryptographic proof of agent activities** through a seamless, **fully customizable** three-layer stack:

> **"If you can fetch it from an API, you can prove it on-chain."**

Define your own rules. Create your own checks. Prove any activity.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VERITAS PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   Activity      │  │   Validation    │  │   Verification  │      │
│  │   Recording     │  │   (Primus)      │  │   (On-Chain)    │      │
│  │                 │  │                 │  │                 │      │
│  │ • Agent Registry│  │ • zkTLS Proofs  │  │ • Proof Storage │      │
│  │ • Metadata      │  │ • API Attests   │  │ • Score Calc    │      │
│  │ • Ownership     │  │ • Auto-Callback │  │ • Queryable     │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│          │                   │                   │                   │
│          ▼                   ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              "Prove any agent activity,                      │    │
│  │               store it on-chain,                             │    │
│  │               query it forever"                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
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
    8,      // decimals
    300,    // max age 5 min
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
    2,
    60,     // 1 minute freshness
    "Binance BTC Price"
);

// Result: zkTLS proof of price at timestamp
// DeFi protocols can verify before using
```

### 🖥️ Computation Results
```solidity
// Prove ML inference was run on specific data
app.addRule(
    "https://ml-service.com/inference/{jobId}",
    "prediction",
    "$.result.prediction",
    6,
    600,
    "ML Inference Result"
);

// Result: Proof that model produced specific output
// Audit trail for AI decisions
```

### 🛠️ Service Delivery
```solidity
// Prove API service responded correctly
app.addRule(
    "https://api.service.com/health",
    "status",
    "$.status",
    0,
    30,
    "Service Health Check"
);

// Result: Uptime proof for SLA enforcement
```

## 🏗️ Architecture

### Layer 1: Activity Recording (ERC-8004)

Agents register as on-chain entities with standardized metadata:

```solidity
// Register your agent
uint256 agentId = identityRegistry.register(agentURI);

// Store capabilities, endpoints, services
{
  "name": "AlphaTrader",
  "services": ["market-analysis", "auto-trading"],
  "endpoint": "https://api.alphatrader.com"
}
```

### Layer 2: Validation (Primus zkTLS)

Cryptographic proof generation for any API call:

```javascript
// Request proof of activity
const taskId = await app.requestValidation({
    agentId: agentId,
    ruleId: 0,              // Which activity to prove
    attestorCount: 1        // How many attestors
});

// Primus network:
// 1. Calls the API (e.g., Coinbase)
// 2. Generates zkTLS proof
// 3. Returns attestation data
```

### Layer 3: Verification (On-Chain)

Smart contracts verify proofs and store results:

```solidity
// Automatic callback when proof is ready
function reportTaskResultCallback(...) {
    // 1. Verify attestation data
    // 2. Extract value using parsePath
    // 3. Run custom checks
    // 4. Calculate score
    // 5. Store permanently
}
```

## 🔥 Why Veritas?

| Traditional | Veritas |
|-------------|---------|
| "Trust me bro" | Cryptographic proof |
| Expensive audits | Automated validation |
| Opaque black box | Transparent, verifiable |
| Centralized trust | Decentralized verification |
| Easy to fake | Impossible to forge |

## 🎯 Use Cases

### For DeFi Protocols
**Prove liquidity operations**
```javascript
// Before accepting a deposit, verify the agent
// actually deposited funds to the pool
const proof = await verifyActivity(agentId, "deposit");
if (proof.score >= 95) {
    acceptDeposit(agentId, amount);
}
```

### For AI Marketplaces
**Prove service quality**
```javascript
// Customers verify agent completed task
// before releasing payment
const completed = await verifyActivity(agentId, taskId);
if (completed) {
    releasePayment(agentId, reward);
}
```

### For Data Providers
**Prove data freshness**
```javascript
// Smart contracts verify price data
// came from Binance < 1 minute ago
const { score, timestamp } = await verifyActivity(
    agentId, 
    "binance-price"
);
if (score >= 90 && timestamp > now - 60) {
    usePrice(data);
}
```

### For Compliance
**Immutable audit trail**
```javascript
// Every action by regulated AI agents
// is permanently recorded on-chain
const history = await getActivityHistory(agentId);
// Perfect for regulatory compliance
```

## 📦 Quick Start

```bash
# Install dependencies
npm install

# Deploy contracts
npx hardhat run scripts/deploy-and-test.js --network baseSepolia
```

## 💻 Example: Prove a Trade

```javascript
import { VeritasSDK } from './src/sdk';

const sdk = new VeritasSDK({ signer, network: 'sepolia' });

// 1. Register your trading agent
const agentId = await sdk.registerAgent({
  name: "HighFreqTrader",
  services: [{ name: "Arbitrage", endpoint: "..." }]
});

// 2. Define what to prove
await sdk.addRule({
  templateId: "https://api.exchange.com/trades/{tradeId}",
  dataKey: "filledAmount",
  parsePath: "$.filled_amount",  // Security: exact field
  decimals: 8,
  maxAge: 60,
  description: "Trade Execution"
});

// 3. Request proof
const taskId = await sdk.requestValidation(agentId, 0);

// 4. Wait for proof
const result = await sdk.waitForAttestation(taskId);
console.log(`Trade proven! Score: ${result.score}/100`);

// 5. Anyone can verify
const proof = await sdk.getActivityProof(agentId, taskId);
// { score: 95, timestamp: 1699123456, data: "..." }
```

## 🔧 Fully Customizable Rules & Checks

Veritas is designed for **maximum flexibility**. Define any activity you want to prove with custom rules and validation logic.

### Define Any Rule

```solidity
// Prove Twitter follower count
app.addRule(
    "https://api.twitter.com/2/users/{userId}/followers",  // url
    "follower_count",                                       // dataKey
    "$.data.public_metrics.followers_count",               // parsePath
    0,      // No decimals
    3600,   // 1 hour freshness
    "Twitter Followers"
);

// Prove GitHub commit
app.addRule(
    "https://api.github.com/repos/{owner}/{repo}/commits/{sha}",
    "commit_author",
    "$.commit.author.name",
    0,
    86400,  // 1 day
    "GitHub Commit"
);

// Prove weather data
app.addRule(
    "https://api.weather.com/v1/current?city={city}",
    "temperature",
    "$.current.temp_c",
    1,
    600,    // 10 minutes
    "Temperature Proof"
);

// Prove any API response...
```

**Any URL. Any JSON path. Any validation logic.**

### Create Any Check

```solidity
// Check 1: Price must be in range
contract PriceRangeCheck is ICustomCheck {
    function validate(string memory dataKey, string memory data, bytes memory params) 
        external override returns (bool passed, int128 value) 
    {
        (int128 min, int128 max) = abi.decode(params, (int128, int128));
        value = extractValue(data, dataKey);
        passed = (value >= min && value <= max);
    }
}

// Check 2: String must match pattern
contract RegexCheck is ICustomCheck {
    function validate(string memory dataKey, string memory data, bytes memory params)
        external override returns (bool passed, int128 value)
    {
        string memory pattern = abi.decode(params, (string));
        string memory extracted = extractString(data, dataKey);
        passed = matchRegex(extracted, pattern);
        value = passed ? 1 : 0;
    }
}

// Check 3: Timestamp must be recent
contract FreshnessCheck is ICustomCheck {
    function validate(string memory dataKey, string memory data, bytes memory params)
        external override returns (bool passed, int128 value)
    {
        uint256 maxAge = abi.decode(params, (uint256));
        uint256 timestamp = extractTimestamp(data, dataKey);
        passed = (block.timestamp - timestamp <= maxAge);
        value = int128(uint128(block.timestamp - timestamp));
    }
}

// Check 4: List must contain item
contract ContainsCheck is ICustomCheck {
    function validate(string memory dataKey, string memory data, bytes memory params)
        external override returns (bool passed, int128 value)
    {
        string memory target = abi.decode(params, (string));
        string[] memory items = extractArray(data, dataKey);
        passed = contains(items, target);
        value = passed ? 1 : 0;
    }
}

// ...add any check you need
```

**Composable, reusable, extensible.**

### Combine Multiple Checks

```solidity
// Prove BTC price with multiple validations
await app.addCheck(ruleId, priceRangeCheck.address, 
    encode(6000000, 10000000),  // $60k-$100k
    60  // 60% weight
);

await app.addCheck(ruleId, freshnessCheck.address,
    encode(300),  // < 5 minutes old
    40  // 40% weight
);

// Final score = weighted average of all checks
```

### Real-World Example: DeFi Agent

```solidity
// Prove a complex trading activity
app.addRule(
    "https://api.1inch.io/v5.0/1/swap",
    "swap_result",
    "$.tx.data",
    18,
    300,
    "1inch Swap Execution"
);

// Checks:
// 1. Slippage < 1%
// 2. Gas price < 50 gwei
// 3. Execution time < 30s
// 4. Token received > expected minimum

await app.addCheck(ruleId, slippageCheck, encode(100), 40);    // 40%
await app.addCheck(ruleId, gasPriceCheck, encode(50e9), 30);   // 30%
await app.addCheck(ruleId, timeCheck, encode(30), 20);         // 20%
await app.addCheck(ruleId, minOutCheck, encode(minAmount), 10);// 10%
```

**Any activity. Any validation. Any complexity.**

## 🔐 Security Features

### Parse Path Validation
```solidity
// Rules specify exact JSON path
parsePath: "$.data.rates.USD"  // Must extract this field
```
Prevents agents from manipulating which data is validated.

### Direct TaskContract Calls
```javascript
// Bypass SDK bug by calling contract directly
await taskContract.submitTask(
  sender, templateId, attestorCount, token, callback, {value: fee}
);
```
Ensures callback is set correctly for auto-verification.

### Custom Checks (Pluggable)
```solidity
// Use built-in checks or create your own
PriceRangeCheck    // Numeric range validation
ThresholdCheck     // Min/max thresholds
RegexCheck         // Pattern matching
FreshnessCheck     // Timestamp validation
ContainsCheck      // Array membership
// ...or implement ICustomCheck
```

## 📚 Documentation

- [Protocol Design](./docs/PROTOCOL_DESIGN.md) - Deep dive into architecture
- [Workflow](./docs/WORKFLOW.md) - Step-by-step guides
- [Custom Checks](./docs/CUSTOM_CHECK_DESIGN.md) - Create validation logic

## 🌐 Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| Primus Task | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |
| VeritasValidationRegistry | `0x257DC4B38066840769EeA370204AD3724ddb0836` |

## 🛣️ Roadmap

- [x] Core proof generation
- [x] Auto-callback mechanism
- [x] Custom validation checks
- [x] Parse path security
- [ ] Mainnet deployment
- [ ] Multi-chain proofs
- [ ] Governance integration

## 📄 License

MIT

---

**Veritas** - Prove any activity. Store it forever. Query it always.

*Verifiable Truth for the Agentic Economy*
