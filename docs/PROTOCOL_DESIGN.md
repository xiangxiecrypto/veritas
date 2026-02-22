# Veritas Protocol Design

## 1. Protocol Overview

### 1.1 Purpose

Veritas Protocol establishes a **standard for verifiable agent capabilities** in the agentic economy. It enables AI agents to:

- Prove their work through cryptographic attestations
- Build verifiable reputation on-chain
- Establish trust with users and other agents
- Participate in decentralized service marketplaces

### 1.2 Core Principles

1. **Verifiability**: All claims must be cryptographically provable
2. **Composability**: Reputation builds across multiple validations
3. **Standardization**: Common interface for all agents (ERC-8004)
4. **Decentralization**: No single point of trust or failure
5. **Privacy**: zkTLS preserves data privacy while enabling verification

### 1.3 System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERITAS PROTOCOL                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │ Identity Layer  │  │ Validation Layer│  │ Reputation Layer│      │
│  │  (ERC-8004)     │  │  (Primus zkTLS) │  │  (ERC-8004)     │      │
│  │                 │  │                 │  │                 │      │
│  │ • Agent Registry│  │ • zkTLS Proofs  │  │ • Score Tracking│      │
│  │ • Metadata      │  │ • Custom Checks │  │ • History       │      │
│  │ • Ownership     │  │ • Auto-Callback │  │ • Aggregations  │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│          │                    │                    │                 │
│          ▼                    ▼                    ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  PrimusVeritasApp.sol                        │    │
│  │           (Orchestrates the validation flow)                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Identity Layer (ERC-8004)

### 2.1 Agent Identity

Each agent is represented as an **ERC-721 NFT** with:

- **Unique ID**: `uint256 agentId`
- **Metadata URI**: Points to agent capabilities, services, endpoints
- **Owner**: Wallet address that controls the agent
- **Transferable**: Agent identity can be sold or transferred

### 2.2 Registration Flow

```solidity
// Agent owner registers
uint256 agentId = identityRegistry.register(agentURI);

// Metadata format (JSON)
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "TradingBot-Alpha",
  "description": "AI-powered trading agent for DeFi",
  "image": "ipfs://Qm...",
  "services": [
    {
      "name": "Price Oracle",
      "endpoint": "https://api.agent.com/price",
      "capabilities": ["market-data", "technical-analysis"]
    }
  ],
  "supportedTrust": ["reputation", "primus-zktls"]
}
```

### 2.3 Identity Verification

```solidity
// Check agent ownership
address owner = identityRegistry.ownerOf(agentId);
require(owner == msg.sender, "Not agent owner");

// Get agent metadata
string memory uri = identityRegistry.tokenURI(agentId);
```

## 3. Validation Layer (Primus zkTLS)

### 3.1 What is zkTLS?

**Zero-Knowledge Transport Layer Security** allows agents to prove they accessed specific APIs/data without revealing the actual content. It combines:

- **TLS**: Standard secure HTTP connection
- **Zero-Knowledge Proofs**: Cryptographic proof of data access

### 3.2 Validation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Agent    │────→│   Primus    │────→│   Veritas   │
│             │     │   Network   │     │   Contract  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │ 1. Request        │                   │
       │──────────────────→│                   │
       │                   │                   │
       │                   │ 2. Fetch Data     │
       │                   │────→ Coinbase API │
       │                   │←──── Price: $68K  │
       │                   │                   │
       │                   │ 3. Generate Proof │
       │                   │ (zkTLS attestation)│
       │                   │                   │
       │                   │ 4. Submit         │
       │                   │──────────────────→│
       │                   │                   │
       │                   │                   │ 5. Verify
       │                   │                   │ & Score
       │                   │                   │
       │                   │ 6. Callback       │
       │                   │←──────────────────│
       │                   │                   │
       │ 7. Result         │                   │
       │←──────────────────│                   │
```

### 3.3 Validation Rules

Rules define what to validate and how:

```solidity
struct VerificationRule {
    string templateId;      // URL to fetch (e.g., Coinbase API)
    string dataKey;         // Key name for the data (e.g., "btcPrice")
    string parsePath;       // JSON path to extract value (e.g., "$.data.rates.USD")
    uint8 decimals;         // Decimal places for numeric values
    uint256 maxAge;         // Maximum age of data (seconds)
    bool active;            // Is this rule active?
    string description;     // Human-readable description
}
```

**Security: Parse Path**

The `parsePath` field specifies the exact JSON path to extract data from API responses. This prevents agents from:
- Extracting wrong fields (e.g., getting ETH price instead of BTC)
- Manipulating which data point is validated
- Claiming validation of one metric while proving another

Example parse paths:
- `$.data.rates.USD` - Coinbase API BTC price
- `$.result.price` - Generic API price field
- `$.data[0].value` - Array index access

### 3.4 Custom Checks

Checks validate extracted data:

```solidity
// Example: Price must be between $60K-$100K
PriceRangeCheck.validate(
    dataKey = "btcPrice",
    attestationData = '{"btcPrice": "68000.00"}',
    params = encode([6000000, 10000000])  // min, max in cents
);
// Returns: (true, 6800000) - passed with value
```

**Available Checks:**
- **PriceRangeCheck**: Numeric value within range
- **ThresholdCheck**: Value above/below threshold
- *(Extensible: add custom checks)*

## 4. Reputation Layer (ERC-8004)

### 4.1 Validation Registry

Stores all validation results:

```solidity
struct ValidationInfo {
    address validatorAddress;   // Who validated
    uint256 agentId;            // Which agent
    string requestURI;          // URL that was validated
    bytes32 requestHash;        // Unique request ID
    uint8 response;             // Score 0-100
    string responseURI;         // Evidence URI
    bytes32 responseHash;       // Evidence hash
    string tag;                 // Category
    uint256 lastUpdate;         // Timestamp
}
```

### 4.2 Scoring System

**Individual Validation:**
- Run multiple checks per validation
- Each check has a weight (score)
- Final score = (sum of passed weights) / (total weights) × 100

**Example:**
```
Check 1: Price in range? (weight: 100) ✓ Passed
Check 2: Data fresh? (weight: 50) ✓ Passed  
Check 3: Source trusted? (weight: 50) ✗ Failed

Score = (100 + 50) / (100 + 50 + 50) × 100 = 75/100
```

**Aggregated Reputation:**
- Multiple validations build history
- Average score across all validations
- Queryable by validator, tag, time period

### 4.3 Progressive Validation

Validators can update scores over time:

```solidity
// First validation
registry.validationResponse(taskId, 50, "", "", "soft-finality");

// Later, more confident
registry.validationResponse(taskId, 100, "", "", "hard-finality");
```

## 5. PrimusVeritasApp - Orchestrator

### 5.1 Role

The `PrimusVeritasApp` contract orchestrates the entire flow:

1. **Registration**: Registers validation with Registry
2. **Submission**: Submits task to Primus (with callback)
3. **Callback**: Receives attestation result automatically
4. **Validation**: Runs custom checks on data
5. **Recording**: Stores result in Registry

### 5.2 Key Functions

```solidity
// User calls this to start validation
function requestValidation(
    uint256 agentId,           // Which agent to validate
    uint256 ruleId,            // Which rule to apply
    uint256[] calldata checkIds, // Which checks to run
    uint256 attestorCount      // How many attestors
) external payable returns (bytes32 taskId);

// Primus calls this when attestation completes
function reportTaskResultCallback(
    bytes32 taskId,
    TaskResult calldata taskResult,
    bool success
) external onlyTask;

// Fallback: Manual processing if callback fails
function processAttestation(
    bytes32 taskId,
    string calldata attestationData,
    uint64 timestamp,
    uint256 ruleId
) external;
```

### 5.3 Why Direct TaskContract Calls?

The Primus SDK's `PrimusNetwork.submitTask()` has a bug where `callbackAddress` is ignored. Solution: Call `TaskContract.submitTask()` directly:

```solidity
// Instead of SDK (buggy):
// await primus.submitTask({ callbackAddress: app.address });

// Use direct call (works):
const taskContract = new ethers.Contract(PRIMUS_TASK, ABI, wallet);
await taskContract.submitTask(
    wallet.address,  // sender
    "",              // templateId
    1,               // attestorCount
    0,               // tokenSymbol (ETH)
    app.address,     // callback ← SET CORRECTLY!
    { value: fee }
);
```

## 6. Security Considerations

### 6.1 Access Control

- **Only Task**: `reportTaskResultCallback()` can only be called by Primus Task contract
- **Only Owner**: Rule management restricted to contract owner
- **Agent Ownership**: Validation requests require agent ownership proof

### 6.2 Data Integrity

- **Request Hash**: Unique identifier prevents replay attacks
- **Response Hash**: Commitment to attestation data
- **Timestamps**: Prevents stale data acceptance
- **zkTLS**: Cryptographic proof of data access

### 6.3 Economic Security

- **Fees**: Users pay for validation (prevents spam)
- **Staking**: Future: Validators stake collateral (slashing for fraud)
- **Refunds**: Excess fees returned to users

## 7. Extensibility

### 7.1 Custom Checks

Add new validation logic:

```solidity
contract MyCustomCheck is ICustomCheck {
    function validate(
        string memory dataKey,
        string memory attestationData,
        bytes memory params
    ) external override returns (bool passed, int128 value) {
        // Your validation logic
    }
}
```

### 7.2 New Validation Types

Support different attestation methods:
- zkML (machine learning proofs)
- TEE attestations (trusted execution environments)
- Multi-party computation proofs

### 7.3 Cross-Chain

Future: Deploy on multiple chains with shared reputation

## 8. Integration Patterns

### 8.1 For Agent Marketplaces

```javascript
// Before listing agent, verify reputation
const { average } = await registry.getSummary(agentId, [], "trading");

if (average >= 80) {
    // List agent with "Verified" badge
    marketplace.listAgent(agentId, { verified: true });
}
```

### 8.2 For DeFi Protocols

```javascript
// Before executing trade, check agent reputation
const { average } = await registry.getSummary(agentId, [], "defi");

if (average >= 90) {
    // Allow high-value trades
    protocol.executeTrade(agentId, trade);
}
```

### 8.3 For AI Orchestration

```javascript
// Agent selects collaborators based on reputation
const agents = await registry.getAgentsByReputation("data-analysis", 80);
const collaborator = selectBest(agents);
```

## 9. Future Work

### 9.1 Governance

- Decentralized rule management
- Validator selection
- Protocol upgrades

### 9.2 Incentives

- Token rewards for validators
- Staking for reputation boost
- Slashing for bad behavior

### 9.3 Privacy

- Zero-knowledge reputation (prove score without revealing history)
- Selective disclosure
- Anonymous validation

## 10. References

- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Trustless Agents
- [Primus Network](https://primuslabs.xyz) - zkTLS attestations
- [Architecture](./ARCHITECTURE.md) - System design
- [Workflow](./WORKFLOW.md) - User flows
