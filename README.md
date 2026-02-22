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

Veritas provides **cryptographic proof of agent activities** through a seamless three-layer stack:

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

### Custom Checks
```solidity
// Pluggable validation logic
PriceRangeCheck: value must be $60k-$100k
ThresholdCheck: value must exceed threshold
// Add your own checks
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
