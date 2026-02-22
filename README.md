# Veritas Protocol

> **Verifiable Truth for the Agentic Economy**

Veritas Protocol enables AI agents to prove their capabilities, build verifiable reputation, and establish trust through cryptographic attestations. By combining ERC-8004 identity standards with Primus zkTLS, Veritas creates a trust layer for the emerging agentic economy.

## 🌟 Vision

As AI agents become autonomous economic actors—trading assets, executing contracts, and providing services—there's a critical need for **verifiable trust**. Veritas addresses this by enabling:

- **Provenance**: Agents can prove their actions and outputs
- **Accountability**: On-chain reputation that can't be faked
- **Interoperability**: Standardized trust signals across platforms
- **Composability**: Reputation that builds across services

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Deploy contracts
npx hardhat run scripts/deploy-and-test.js --network baseSepolia
```

## 📖 How It Works

### The Trust Problem

In the agentic economy, how do you trust an AI agent to:
- Execute a trade correctly?
- Provide accurate data?
- Complete a service as promised?

Traditional solutions rely on:
- Centralized reputation systems (easily gamed)
- Social proofs (unreliable)
- Manual verification (not scalable)

### The Veritas Solution

Veritas provides **cryptographic verification** through a three-layer architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    VERITAS PROTOCOL                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   IDENTITY   │───→│  VALIDATION  │───→│  REPUTATION  │  │
│  │   (ERC-8004) │    │ (Primus zkTLS)│    │  (On-Chain)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│    Agent Registry      Proof of Work       Trust Score       │
│    NFT (ERC-721)      zkTLS Attestation   Queryable History  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Architecture

### 1. Identity Layer (ERC-8004)

Every agent gets a unique on-chain identity:

```solidity
// Register an agent
uint256 agentId = identityRegistry.register(agentURI);
```

- **ERC-721 NFT** representing the agent
- **Metadata** stored on-chain (name, description, capabilities)
- **Transferable ownership** of the agent identity

### 2. Validation Layer (Primus zkTLS)

Agents prove their work through cryptographic attestations:

```solidity
// Request validation
bytes32 taskId = app.requestValidation(
    agentId,      // Which agent
    ruleId,       // What to validate
    checkIds,     // Which checks to run
    attestorCount // How many attestors
);
```

**Security Feature: Parse Path Validation**

Rules include a `parsePath` to prevent data manipulation:

```solidity
// Rule defines exactly which field to extract
app.addRule(
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",  // URL
    "btcPrice",                                                  // Data key
    "$.data.rates.USD",                                         // Parse path ← Security!
    2,                                                          // Decimals
    3600,                                                       // Max age
    "BTC Price Check"
);
```

This ensures agents extract the **correct field** from API responses and cannot manipulate which data point is used for validation.

**How it works:**
1. Agent performs work (e.g., fetches BTC price from Coinbase)
2. Primus network generates zkTLS proof
3. **Parse path ensures correct field is extracted** (`$.data.rates.USD`)
4. Proof is verified on-chain
5. Score is calculated based on validation rules

### 3. Reputation Layer (ERC-8004)

Validation results are stored in a queryable registry:

```solidity
// Get validation status
(address validator, uint256 agent, uint8 score, , ,) = 
    registry.getValidationStatus(taskId);

// Get aggregated stats
(uint64 count, uint8 average) = 
    registry.getSummary(agentId, validators, tag);
```

## 💡 Use Cases

### 1. AI Trading Agents

**Problem:** How do you trust an AI to manage your portfolio?

**Veritas Solution:**
- Agent registers with trading strategy metadata
- Every trade is validated via zkTLS (exchange APIs)
- On-chain reputation tracks win/loss ratio
- Users can query agent's track record before delegating funds

### 2. Data Oracle Agents

**Problem:** How do you verify data from AI-powered oracles?

**Veritas Solution:**
- Agent commits to data sources (e.g., Coinbase, Binance)
- Every data point is cryptographically attested
- Users can verify data provenance on-chain
- Stake slashing for incorrect data

### 3. Service Marketplaces

**Problem:** How do you verify AI service quality?

**Veritas Solution:**
- Service agents build reputation through completed tasks
- Customers validate service delivery via zkTLS
- Reputation becomes composable across marketplaces
- Quality agents get priority matching

### 4. Autonomous Organizations

**Problem:** How do AI agents make trusted decisions collectively?

**Veritas Solution:**
- Voting power weighted by reputation scores
- Decisions validated via multi-party attestations
- Transparent on-chain governance
- Immutable decision history

## 🔧 Technical Implementation

### Core Contracts

| Contract | Purpose |
|----------|---------|
| `PrimusVeritasApp.sol` | Main validation orchestrator |
| `VeritasValidationRegistry.sol` | ERC-8004 validation registry |
| `IdentityRegistry` | ERC-8004 agent identities |
| `PriceRangeCheck.sol` | Custom validation checks |

### Validation Flow

```
User Request
    │
    ▼
┌─────────────────┐
│ 1. Submit Task  │────→ TaskContract.submitTask()
│    (Direct)     │       Sets callback to app
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 2. Attest       │────→ Primus SDK attest()
│    (Off-chain)  │       Generates zkTLS proof
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 3. Callback     │────→ App.reportTaskResultCallback()
│    (Auto)       │       Processes attestation
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 4. Validate     │────→ Custom checks run
│    (On-chain)   │       Score calculated
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 5. Record       │────→ Registry.validationResponse()
│    (On-chain)   │       Result stored
└─────────────────┘
    │
    ▼
Reputation Updated ✓
```

### Key Features

- **Direct TaskContract Calls**: Bypasses SDK bug, sets callback correctly
- **Auto-Callback**: Primus calls contract automatically when attestation completes
- **Custom Checks**: Pluggable validation logic (price ranges, thresholds, etc.)
- **ERC-8004 Compliant**: Standard interface for identity and validation
- **Composability**: Reputation builds across multiple validations

## 📚 Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System design and components
- [Protocol Design](./docs/PROTOCOL_DESIGN.md) - Detailed protocol specification
- [Workflow](./docs/WORKFLOW.md) - Step-by-step user flows
- [Custom Checks](./docs/CUSTOM_CHECK_DESIGN.md) - Creating validation checks

## 🌐 Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| Primus Task | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |
| Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

## 🤝 Integration

### For Agent Developers

```javascript
import { VeritasSDK } from './src/sdk';

const sdk = new VeritasSDK({
  provider,
  signer,
  network: 'sepolia'
});

// 1. Register agent
const agentId = await sdk.registerAgent({
  name: "MyTradingBot",
  description: "AI-powered trading agent"
});

// 2. Request validation
const taskId = await sdk.requestValidation(agentId, ruleId);

// 3. Build reputation
const reputation = await sdk.getReputation(agentId);
```

### For Platform Integrators

```javascript
// Query agent reputation before allowing actions
const { count, average } = await registry.getSummary(
  agentId,
  [],     // All validators
  "trading"  // Filter by tag
);

if (average > 80) {
  // Allow high-value transactions
}
```

## 🛣️ Roadmap

- [x] Core validation protocol
- [x] ERC-8004 compliance
- [x] Primus zkTLS integration
- [ ] Mainnet deployment
- [ ] SDK improvements
- [ ] Governance token
- [ ] Staking and slashing

## 📄 License

MIT

---

**Veritas** - Building the trust layer for the agentic economy.
