# Veritas Protocol - Full Flow Details

## Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| PrimusVeritasAppV2 | `0x0552bD6434D79073d1167BC39d4D01f6c3333F6e` |
| VeritasValidationRegistryV2 | `0xF18C120B0cc018c0862eDaE6B89AB2485FD35EE3` |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Primus TaskContract | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |

---

## Step 1: Request Verification

### Transaction
```
Tx Hash: 0x1f6625bc1d7082805b79701a2726d69066cf2f583ccd4b4bda5d04528f732e9a
Block: 37724609
Status: Success
Explorer: https://sepolia.basescan.org/tx/0x1f6625bc1d7082805b79701a2726d69066cf2f583ccd4b4bda5d04528f732e9a
```

### Function Called
```solidity
PrimusVeritasAppV2.requestVerification(
    uint256 ruleId,    // 2 (BTC/USD rule with dataKey="btcPrice")
    uint256 agentId    // 674 (agent to credit reputation to)
) external payable returns (bytes32 taskId)
```

### What It Does
1. **Verifies ownership**: Checks `msg.sender == IdentityRegistry.ownerOf(agentId)`
   - Only the agent owner can request verification
2. **Gets the rule**: Reads `rules[ruleId]` for URL, dataKey, score, maxAge
3. **Submits to Primus**: Calls `PrimusTask.submitTask()` with:
   - `sender`: wallet address
   - `templateId`: rule URL (`https://api.coinbase.com/v2/exchange-rates?currency=BTC`)
   - `attestorCount`: 1
   - `tokenSymbol`: ETH (0)
   - `callback`: `0x0552bD6434D79073d1167BC39d4D01f6c3333F6e` (our contract)
   - `value`: 10,000,000,000 wei (0.00000001 ETH)
4. **Stores request**: Saves to `requests[taskId]` mapping
5. **Emits event**: `VerificationRequested(taskId, ruleId, agentId)`

### Output
- **Task ID**: `0x0322d71c9df47cbdf1e16d1677ca4b5543ecfb9f4c0f6efb380659432489ec4b`
- **Callback**: Set to our contract (important for verification)

### Internal Call to Primus
The contract internally calls:
```solidity
PrimusTask.submitTask{value: 10000000000}(
    msg.sender,           // 0x89BBf3451643eef216c3A60d5B561c58F0D8adb9
    "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    1,                    // attestorCount
    TokenSymbol.ETH,      // 0
    address(this)         // callback = 0x0552bD6434D79073d1167BC39d4D01f6c3333F6e
)
```

---

## Step 2: SDK Attestation (Off-Chain)

### SDK Call
```javascript
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const primus = new PrimusNetwork();
await primus.init(wallet, 84532);  // Base Sepolia chain ID

const result = await primus.attest({
  address: wallet.address,
  userAddress: wallet.address,
  taskId: "0x0322d71c9df47cbdf1e16d1677ca4b5543ecfb9f4c0f6efb380659432489ec4b",
  taskTxHash: "0x1f6625bc1d7082805b79701a2726d69066cf2f583ccd4b4bda5d04528f732e9a",
  taskAttestors: ["0x0DE886e31723e64Aa72e51977B14475fB66a9f72"],
  requests: [{
    url: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    method: "GET",
    header: "",
    body: ""
  }],
  responseResolves: [[{  // ⚠️ MUST be array of arrays!
    keyName: "btcPrice",
    parseType: "",
    parsePath: "$.data.rates.USD"
  }]]
}, 60000);  // 60 second timeout
```

### What It Does
1. **Connects to attestor**: Finds fastest Phala TEE worker
   - URL: `d511b29f688cd0c2d7d9ec3e148e51b63a5390cf-18080.dstack-base-prod7.phala.network`
2. **Performs zkTLS attestation**:
   - Attestor makes HTTPS request to Coinbase API
   - Generates zero-knowledge proof of the TLS response
   - Cryptographically signs the attestation
3. **Extracts data**: Uses `parsePath` to extract `$.data.rates.USD` from response
4. **Submits on-chain**: Sends attestation to Primus TaskContract

### Output
```json
{
  "attestation": {
    "recipient": "0x89BBf3451643eef216c3A60d5B561c58F0D8adb9",
    "request": [{
      "url": "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
      "header": "",
      "method": "GET",
      "body": ""
    }],
    "responseResolves": [{
      "oneUrlResponseResolve": [{
        "keyName": "btcPrice",
        "parseType": "",
        "parsePath": "$.data.rates.USD"
      }]
    }],
    "data": "{\"btcPrice\":\"68164.45\"}",
    "attConditions": "",
    "timestamp": 1771212303269,
    "additionParams": "{\"algorithmType\":\"proxytls\"}"
  },
  "attestor": "0x0DE886e31723e64Aa72e51977B14475fB66a9f72",
  "signature": "0x...",
  "reportTxHash": "...",
  "taskId": "0x0322d71c9df47cbdf1e16d1677ca4b5543ecfb9f4c0f6efb380659432489ec4b",
  "attestationTime": 5518
}
```

---

## Step 3: Submit Attestation to Contract

### Transaction
```
Tx Hash: 0x8a6741e799b5dd04bb6e6945a2f6f15d72041749ca30ac3ea7391d1ee4a159fa
Block: 37724672
Status: Success
Gas Used: 381,842
Explorer: https://sepolia.basescan.org/tx/0x8a6741e799b5dd04bb6e6945a2f6f15d72041749ca30ac3ea7391d1ee4a159fa
```

### Function Called
```solidity
PrimusVeritasAppV2.submitAttestation(
    bytes32 taskId,              // 0x0322d71c9df47cbdf1e16d1677ca4b5543ecfb9f4c0f6efb380659432489ec4b
    string attestationUrl,       // "https://api.coinbase.com/v2/exchange-rates?currency=BTC"
    string attestationData,      // "{\"btcPrice\":\"68164.45\"}"
    uint64 attestationTimestamp  // 1771212303 (seconds, not milliseconds)
) external
```

### What It Does
1. **Validates request exists**:
   ```solidity
   VerificationRequest storage req = requests[taskId];
   require(!req.completed, "Already completed");
   require(req.requester != address(0), "Request not found");
   ```

2. **Queries Primus to verify attestation**:
   ```solidity
   TaskInfo memory taskInfo = primusTask.queryTask(taskId);
   require(taskInfo.taskStatus == 1, "Task not completed");
   require(taskInfo.callback == address(this), "Not our task");
   require(taskInfo.taskResults.length > 0, "No attestation");
   ```

3. **Verifies URL matches** (using templateId, not att.request!):
   ```solidity
   require(
       keccak256(bytes(taskInfo.templateId)) == keccak256(bytes(attestationUrl)),
       "URL mismatch"
   );
   ```

4. **Verifies data matches**:
   ```solidity
   require(
       keccak256(bytes(att.data)) == keccak256(bytes(attestationData)),
       "Data mismatch"
   );
   ```

5. **Calls ValidationRegistry**:
   ```solidity
   VeritasValidationRegistryV2.ValidationParams memory params = ...
   params.agentId = 674;
   params.ruleId = 2;
   params.attestationUrl = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
   params.attestationData = "{\"btcPrice\":\"68164.45\"}";
   params.expectedDataKey = "btcPrice";  // Must match keyName in SDK!
   params.score = 100;
   
   registry.validateAttestation(params);
   ```

6. **ValidationRegistry**:
   - Parses JSON: `{"btcPrice":"68164.45"}`
   - Extracts value using `dataKey`: `68164.45`
   - Calls `ReputationRegistry.giveFeedback(674, 100)`

7. **Marks completed**:
   ```solidity
   req.completed = true;
   emit VerificationCompleted(taskId, 674, 100);
   ```

### Events Emitted

**From PrimusVeritasAppV2:**
```
VerificationCompleted(
  taskId: 0x0322d71c9df47cbdf1e16d1677ca4b5543ecfb9f4c0f6efb380659432489ec4b,
  agentId: 674,
  score: 100
)
```

**From VeritasValidationRegistryV2:**
```
AttestationValidated(agentId: 674, taskId: ..., score: 100)
```

**From ReputationRegistry:**
```
FeedbackGiven(agentId: 674, score: 100)
```

---

## Summary Table

| Step | Transaction | Function | Result |
|------|-------------|----------|--------|
| 1 | [Request](https://sepolia.basescan.org/tx/0x1f6625bc1d7082805b79701a2726d69066cf2f583ccd4b4bda5d04528f732e9a) | `requestVerification(2, 674)` | Task created, callback set |
| 2 | (off-chain) | `SDK.attest()` | zkTLS proof generated |
| 3 | [Submit](https://sepolia.basescan.org/tx/0x8a6741e799b5dd04bb6e6945a2f6f15d72041749ca30ac3ea7391d1ee4a159fa) | `submitAttestation()` | Agent 674 earned 100 reputation |

---

## Key Insights

1. **Primus does NOT auto-callback** - Must call `submitAttestation()` manually
2. **SDK responseResolves** must be `[[{...}]]` (array of arrays, not just array)
3. **URL is in `taskInfo.templateId`**, not `attestation.request` (which is empty)
4. **dataKey must match SDK keyName** - e.g., `"btcPrice"` not `"data.rates.USD"`
5. **Fee is exactly 10^10 wei** = 0.00000001 ETH (not 10 wei!)
6. **Timestamp is in seconds** for contract, milliseconds from SDK

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERITAS PROTOCOL FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

     User/Agent                    Contracts                      Primus Network
         │                             │                               │
         │ 1. requestVerification()    │                               │
         │────────────────────────────>│                               │
         │                             │                               │
         │                             │ submitTask(callback=App)      │
         │                             │──────────────────────────────>│
         │                             │                               │
         │                             │ TaskCreated(taskId)           │
         │                             │<──────────────────────────────│
         │                             │                               │
         │ 2. SDK.attest(taskId)       │                               │
         │─────────────────────────────────────────────────────────────>│
         │                             │                               │
         │                             │          zkTLS Attestation    │
         │                             │          (HTTPS to Coinbase)  │
         │                             │                               │
         │ Attestation Result          │                               │
         │<─────────────────────────────────────────────────────────────│
         │  - data: {"btcPrice":"..."} │                               │
         │  - timestamp                │                               │
         │                             │                               │
         │ 3. submitAttestation()      │                               │
         │────────────────────────────>│                               │
         │                             │                               │
         │                             │ queryTask(taskId)             │
         │                             │──────────────────────────────>│
         │                             │                               │
         │                             │ TaskResult(attestation)       │
         │                             │<──────────────────────────────│
         │                             │                               │
         │                             │ validateAttestation()         │
         │                             │──────────────┐                │
         │                             │              │                │
         │                             │ giveFeedback(agentId, score)  │
         │                             │──────────────┼───────────────>│
         │                             │              │   ReputationRegistry
         │                             │<─────────────┘                │
         │                             │                               │
         │ VerificationCompleted       │                               │
         │<────────────────────────────│                               │
         │                             │                               │
```

---

## Rule Configuration

| Rule ID | URL | Data Key | Score | Max Age | Description |
|---------|-----|----------|-------|---------|-------------|
| 0 | Coinbase BTC/USD | `data.rates.USD` | 100 | 1h | (Old format - won't work) |
| 1 | Coinbase ETH/USD | `data.rates.USD` | 95 | 2h | (Old format - won't work) |
| 2 | Coinbase BTC/USD | `btcPrice` | 100 | 1h | ✅ Working! |

---

## Gas Costs

| Step | Gas Used | Cost (at 1 gwei) |
|------|----------|-----------------|
| Deploy App | ~1,200,000 | ~0.0012 ETH |
| Add Rule | ~200,000 | ~0.0002 ETH |
| Request Verification | ~250,000 | ~0.00025 ETH |
| Submit Attestation | ~382,000 | ~0.00038 ETH |

**Total per verification**: ~632,000 gas (~0.00063 ETH)
