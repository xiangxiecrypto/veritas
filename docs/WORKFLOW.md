# Workflow

## Quick Reference

```
STEP 1: REGISTER → IdentityRegistry.register() → agentId
STEP 2: VERIFY   → PrimusVeritasApp.requestVerification(agentId) → reputation
```

## Step-by-Step Guide

### Step 1: Register Agent Identity

Register your agent to get a permanent on-chain identity.

**Using SDK:**

```typescript
import { VeritasSDK } from './src/sdk';
import { ethers } from 'ethers';

// Setup
const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const sdk = new VeritasSDK({ provider, signer, network: 'sepolia' });
await sdk.initialize();

// Register
const agentId = await sdk.registerIdentity("My Agent", "AI trading assistant");
console.log(`Agent ID: ${agentId}`);
```

**Using Contract Directly:**

```javascript
const identityRegistry = new ethers.Contract(
  '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  ['function register(string) returns (uint256)'],
  signer
);

const metadata = JSON.stringify({
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "My Agent",
  description: "AI trading assistant"
});
const agentURI = 'data:application/json;base64,' + Buffer.from(metadata).toString('base64');

const tx = await identityRegistry.register(agentURI);
const receipt = await tx.wait();
// Get agentId from Registered event
```

### Step 2: Request Verification

Build reputation by requesting attestation.

**Using SDK:**

```typescript
// Check available rules
const rules = await sdk.getVerificationRules();
console.log(rules);
// [
//   { id: 0, url: 'Coinbase BTC/USD', score: 100, ... },
//   { id: 1, url: 'Coinbase ETH/USD', score: 95, ... }
// ]

// Request verification (must be agent owner)
const taskId = await sdk.requestVerification(agentId, 0); // Rule 0 = BTC price
console.log(`Task ID: ${taskId}`);
```

**Using Contract Directly:**

```javascript
const app = new ethers.Contract(
  '0xa70063A1970c9c10d0663610Fe7a02495548ba9b',
  ['function requestVerification(uint256,uint256) payable returns (bytes32)'],
  signer
);

const tx = await app.requestVerification(0, agentId, {
  value: ethers.utils.parseEther('0.00000001') // Primus fee
});
const receipt = await tx.wait();
// Get taskId from VerificationRequested event
```

### Step 3: Wait for Callback

Primus will:
1. Fetch the URL (e.g., Coinbase BTC price)
2. Create zkTLS attestation
3. Call back to PrimusVeritasApp
4. Validate attestation
5. Grant reputation

**This happens automatically - no action needed.**

### Step 4: Check Reputation

```typescript
const summary = await sdk.getReputationSummary(
  agentId,
  ['0xa70063A1970c9c10d0663610Fe7a02495548ba9b'] // Client addresses
);
console.log(`Reputation: ${summary.averageValue} (count: ${summary.count})`);
```

## Complete Flow in One Call

```typescript
const { agentId, taskId } = await sdk.registerAndVerify(
  "My Agent",
  "AI trading assistant",
  0  // Rule 0 = BTC price
);
```

## Common Patterns

### Pattern 1: Multiple Verifications

```typescript
// Register once
const agentId = await sdk.registerIdentity("Multi-Verify Agent", "Tests multiple APIs");

// Request multiple verifications
await sdk.requestVerification(agentId, 0); // BTC price
await sdk.requestVerification(agentId, 1); // ETH price
```

### Pattern 2: Check Before Request

```typescript
// Verify ownership first
const isOwner = await sdk.isAgentOwner(agentId);
if (!isOwner) {
  throw new Error("Not the agent owner");
}

// Then request
await sdk.requestVerification(agentId, 0);
```

### Pattern 3: Monitor Task Status

```typescript
// After requestVerification, check Primus task
const taskId = await sdk.requestVerification(agentId, 0);

// Query Primus TaskContract (optional)
const primusTask = new ethers.Contract(
  '0xC02234058caEaA9416506eABf6Ef3122fCA939E8',
  ['function queryTask(bytes32) view returns (tuple(string,address,address[],tuple(address,bytes32,tuple(address,bytes,bytes,string,uint64))[],uint64,uint8,address,uint8))'],
  provider
);

const taskInfo = await primusTask.queryTask(taskId);
console.log(`Status: ${taskInfo.taskStatus}`); // 0=INIT, 1=SUCCESS, etc.
```

## Error Handling

### "Not agent owner"
```
Cause: msg.sender != ownerOf(agentId)
Fix: Use the wallet that registered the agent
```

### "Rule inactive"
```
Cause: Verification rule is disabled
Fix: Use a different ruleId
```

### "Paying Fee is not correct"
```
Cause: Wrong ETH amount sent
Fix: Send exactly 0.00000001 ETH
```

### "Already validated"
```
Cause: TaskId already used
Fix: Each verification request gets unique taskId
```
