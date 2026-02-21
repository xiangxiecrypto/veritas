# Veritas Protocol Workflow

This document describes the complete workflows for different user types interacting with Veritas Protocol.

## Table of Contents

1. [Agent Owner Workflow](#1-agent-owner-workflow)
2. [Validator Workflow](#2-validator-workflow)
3. [Platform Integrator Workflow](#3-platform-integrator-workflow)
4. [End User Workflow](#4-end-user-workflow)
5. [Complete Example: Trading Agent](#5-complete-example-trading-agent)

---

## 1. Agent Owner Workflow

### Overview
As an agent owner, you want to register your AI agent, get it validated, and build reputation.

### Step-by-Step

#### Step 1: Register Agent Identity

```javascript
import { VeritasSDK } from './src/sdk';

const sdk = new VeritasSDK({
  provider,
  signer,
  network: 'sepolia'
});

await sdk.initialize();

// Register your agent
const agentId = await sdk.registerAgent({
  name: "DeFiTrader-Alpha",
  description: "AI-powered DeFi trading agent with technical analysis",
  image: "https://example.com/agent-image.png",
  services: [
    {
      name: "Market Analysis",
      endpoint: "https://api.myagent.com/analyze",
      capabilities: ["price-prediction", "risk-assessment"]
    },
    {
      name: "Auto Trading",
      endpoint: "https://api.myagent.com/trade",
      capabilities: ["swap", "liquidity-provision"]
    }
  ]
});

console.log(`Agent registered with ID: ${agentId}`);
```

**What happens:**
- ERC-721 NFT minted for your agent
- Metadata stored on-chain
- You become the agent owner

#### Step 2: Add Validation Rules

```javascript
// As contract owner, add rules for validation
const app = await ethers.getContractAt("PrimusVeritasApp", appAddress);

// Add a rule: BTC price validation
await app.addRule(
  "https://api.coinbase.com/v2/exchange-rates?currency=BTC",  // templateId (URL)
  "btcPrice",                                                 // dataKey
  2,                                                          // decimals (cents)
  3600,                                                       // maxAge (1 hour)
  "BTC Price Check"                                           // description
);

// Add validation checks
const priceCheck = await ethers.getContractAt("PriceRangeCheck", checkAddress);
const params = ethers.utils.defaultAbiCoder.encode(
  ['int128', 'int128'],
  [6000000, 10000000]  // $60k-$100k in cents
);

await app.addCheck(
  0,                  // ruleId
  priceCheck.address, // checkContract
  params,             // params
  100                 // score weight
);
```

**What happens:**
- Rule created for BTC price validation
- Check added to ensure price is in valid range
- Rule becomes available for agents to use

#### Step 3: Request Validation

```javascript
// Request validation for your agent
const taskId = await sdk.requestValidation({
  agentId: agentId,
  ruleId: 0,              // Use the BTC price rule
  checkIds: [],           // Run all checks (empty = all)
  attestorCount: 1        // Number of attestors
});

console.log(`Validation requested. Task ID: ${taskId}`);
```

**What happens:**
- Validation registered with Registry
- Task submitted to Primus network
- Fee paid in ETH
- Callback set to automatically process result

#### Step 4: Wait for Attestation

```javascript
// Poll for attestation result
const result = await sdk.waitForAttestation(taskId);

console.log(`Attestation complete!`);
console.log(`BTC Price: $${result.btcPrice}`);
console.log(`Score: ${result.score}/100`);
```

**What happens:**
- Primus network fetches data from Coinbase
- Generates zkTLS proof
- Submits proof on-chain
- Contract automatically validates

#### Step 5: Check Reputation

```javascript
// Query agent reputation
const reputation = await sdk.getReputation(agentId);

console.log(`Total validations: ${reputation.count}`);
console.log(`Average score: ${reputation.average}/100`);
console.log(`History: ${reputation.history}`);
```

**What happens:**
- Aggregates all validations
- Calculates average score
- Returns complete reputation history

---

## 2. Validator Workflow

### Overview
As a validator, you want to provide attestation services and earn fees.

### Step-by-Step

#### Step 1: Set Up Validator Node

```javascript
// Run a Primus validator node
const validator = new PrimusValidator({
  network: 'sepolia',
  privateKey: process.env.VALIDATOR_KEY
});

await validator.start();
```

**What happens:**
- Validator node connects to Primus network
- Ready to process validation requests
- Stake collateral (future)

#### Step 2: Process Validation Request

```javascript
// When validation request comes in
validator.on('validationRequest', async (request) => {
  console.log(`New validation request: ${request.taskId}`);
  
  // Fetch data from URL
  const data = await fetch(request.url);
  
  // Generate zkTLS proof
  const proof = await validator.generateProof({
    url: request.url,
    data: data,
    taskId: request.taskId
  });
  
  // Submit attestation
  await validator.submitAttestation(proof);
});
```

**What happens:**
- Validator fetches data from source
- Generates cryptographic proof
- Submits to Primus contract
- Earns fee for service

---

## 3. Platform Integrator Workflow

### Overview
As a platform (marketplace, DeFi protocol, etc.), you want to verify agent reputation before allowing actions.

### Step-by-Step

#### Step 1: Query Agent Reputation

```javascript
// Before allowing agent to perform action
async function verifyAgent(agentId) {
  const registry = await ethers.getContractAt(
    "VeritasValidationRegistry",
    registryAddress
  );
  
  // Get overall reputation
  const { count, averageResponse } = await registry.getSummary(
    agentId,
    [],     // All validators
    ""      // All tags
  );
  
  // Get specific category reputation
  const { count: tradingCount, averageResponse: tradingScore } = 
    await registry.getSummary(agentId, [], "trading");
  
  return {
    totalValidations: count,
    overallScore: averageResponse,
    tradingScore: tradingScore,
    isVerified: averageResponse >= 80 && count >= 5
  };
}
```

**What happens:**
- Queries ValidationRegistry
- Gets aggregated statistics
- Returns verification status

#### Step 2: Make Decision

```javascript
async function allowAction(agentId, action) {
  const reputation = await verifyAgent(agentId);
  
  if (!reputation.isVerified) {
    throw new Error("Agent not verified");
  }
  
  if (action.value > 10000 && reputation.tradingScore < 90) {
    throw new Error("High-value action requires higher score");
  }
  
  // Allow action
  return true;
}
```

**What happens:**
- Checks reputation requirements
- Enforces minimum scores
- Allows/denies actions based on trust

#### Step 3: Display Trust Badges

```javascript
// In UI, show trust indicators
function getTrustBadge(reputation) {
  if (reputation.overallScore >= 95) {
    return { badge: "🌟 Elite", color: "gold" };
  } else if (reputation.overallScore >= 80) {
    return { badge: "✅ Verified", color: "green" };
  } else if (reputation.overallScore >= 60) {
    return { badge: "⚠️ Developing", color: "yellow" };
  } else {
    return { badge: "❌ Unverified", color: "red" };
  }
}
```

---

## 4. End User Workflow

### Overview
As an end user, you want to interact with trusted AI agents.

### Step-by-Step

#### Step 1: Discover Agents

```javascript
// Browse verified agents
const agents = await marketplace.getAgents({
  verified: true,
  minScore: 80,
  category: "trading"
});

// Display with trust scores
agents.forEach(agent => {
  console.log(`${agent.name} - Score: ${agent.score}/100`);
});
```

#### Step 2: Verify Before Delegating

```javascript
// Before giving agent access to funds
async function verifyBeforeDelegate(agentId) {
  const registry = await ethers.getContractAt(
    "VeritasValidationRegistry",
    registryAddress
  );
  
  // Get recent validations
  const validationIds = await registry.getAgentValidations(agentId);
  
  // Check last 5 validations
  const recentValidations = await Promise.all(
    validationIds.slice(-5).map(id => 
      registry.getValidationStatus(id)
    )
  );
  
  const allPassed = recentValidations.every(v => v.response >= 80);
  
  if (!allPassed) {
    alert("Agent has recent failures. Proceed with caution.");
  }
  
  return allPassed;
}
```

#### Step 3: Monitor Performance

```javascript
// Track agent performance over time
async function monitorAgent(agentId) {
  const reputation = await sdk.getReputation(agentId);
  
  // Set up monitoring
  setInterval(async () => {
    const updated = await sdk.getReputation(agentId);
    
    if (updated.average < previousAverage) {
      console.warn("Agent reputation declining!");
    }
  }, 86400000); // Check daily
}
```

---

## 5. Complete Example: Trading Agent

### Scenario
A developer creates an AI trading agent and wants to build reputation on Veritas.

### Full Implementation

```javascript
import { ethers } from 'ethers';
import { VeritasSDK } from './src/sdk';

async function main() {
  // Setup
  const provider = new ethers.providers.JsonRpcProvider(
    'https://sepolia.base.org'
  );
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const sdk = new VeritasSDK({
    provider,
    signer,
    network: 'sepolia'
  });
  
  await sdk.initialize();
  
  // Step 1: Register Agent
  console.log("📝 Registering agent...");
  const agentId = await sdk.registerAgent({
    name: "AlphaTrader",
    description: "AI trading agent with 85% win rate",
    services: [{
      name: "Auto Trading",
      endpoint: "https://api.alphatrader.com/trade"
    }]
  });
  console.log(`✅ Agent registered: ID ${agentId}`);
  
  // Step 2: Setup Validation
  console.log("\n⚙️ Setting up validation rules...");
  
  // Rule 1: BTC price validation
  await sdk.addRule({
    templateId: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    dataKey: "btcPrice",
    decimals: 2,
    maxAge: 3600,
    description: "BTC Price Check"
  });
  
  // Rule 2: ETH price validation
  await sdk.addRule({
    templateId: "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
    dataKey: "ethPrice",
    decimals: 2,
    maxAge: 3600,
    description: "ETH Price Check"
  });
  
  // Add price range check ($60k-$100k for BTC)
  await sdk.addCheck(0, {
    type: "priceRange",
    min: 6000000,
    max: 10000000,
    weight: 100
  });
  
  console.log("✅ Rules configured");
  
  // Step 3: Request Validation
  console.log("\n🔐 Requesting validation...");
  const taskId = await sdk.requestValidation({
    agentId: agentId,
    ruleId: 0,
    attestorCount: 1
  });
  console.log(`⏳ Validation in progress: ${taskId}`);
  
  // Step 4: Wait for Result
  console.log("\n⏳ Waiting for attestation...");
  const result = await sdk.waitForAttestation(taskId, {
    timeout: 120000, // 2 minutes
    onProgress: (status) => {
      console.log(`  Status: ${status}`);
    }
  });
  
  console.log("\n✅ Validation complete!");
  console.log(`  Score: ${result.score}/100`);
  console.log(`  Data: ${result.data}`);
  
  // Step 5: Check Reputation
  console.log("\n📊 Checking reputation...");
  const reputation = await sdk.getReputation(agentId);
  
  console.log("Reputation Summary:");
  console.log(`  Total validations: ${reputation.count}`);
  console.log(`  Average score: ${reputation.average}/100`);
  console.log(`  Status: ${reputation.average >= 80 ? '✅ Verified' : '⚠️ Developing'}`);
  
  // Step 6: List on Marketplace
  if (reputation.average >= 80) {
    console.log("\n🚀 Listing on marketplace...");
    await marketplace.listAgent(agentId, {
      verified: true,
      score: reputation.average
    });
    console.log("✅ Agent listed with verified badge!");
  }
}

main().catch(console.error);
```

### Output

```
📝 Registering agent...
✅ Agent registered: ID 1234

⚙️ Setting up validation rules...
✅ Rules configured

🔐 Requesting validation...
⏳ Validation in progress: 0xabc123...

⏳ Waiting for attestation...
  Status: pending
  Status: processing
  Status: attesting
  Status: completed

✅ Validation complete!
  Score: 95/100
  Data: {"btcPrice": "68432.15"}

📊 Checking reputation...
Reputation Summary:
  Total validations: 1
  Average score: 95/100
  Status: ✅ Verified

🚀 Listing on marketplace...
✅ Agent listed with verified badge!
```

---

## Summary

| User Type | Primary Actions | Key Contracts |
|-----------|----------------|---------------|
| **Agent Owner** | Register, validate, monitor | IdentityRegistry, PrimusVeritasApp |
| **Validator** | Run node, process requests | Primus Network |
| **Platform** | Query, verify, enforce | VeritasValidationRegistry |
| **End User** | Discover, verify, delegate | All contracts |

All workflows converge on the same principle: **cryptographic proof of agent capabilities**.
