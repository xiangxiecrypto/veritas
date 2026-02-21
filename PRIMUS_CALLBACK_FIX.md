# Primus Integration Guide

## The Issue

Primus SDK's `PrimusNetwork.submitTask()` ignores the `callbackAddress` parameter, preventing auto-callback functionality.

## The Solution

Call `TaskContract.submitTask()` directly using ethers.js. This bypasses the SDK bug and correctly sets the callback address.

## Implementation

### 1. Define TaskContract ABI

```javascript
const TASK_ABI = [
  "function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee))",
  "function submitTask(address sender, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback) payable returns (bytes32)",
  "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)",
  "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
];
```

### 2. Submit Task Directly

```javascript
const taskContract = new ethers.Contract(
  '0xC02234058caEaA9416506eABf6Ef3122fCA939E8',  // Primus Task
  TASK_ABI,
  wallet
);

// Get fee
const feeInfo = await taskContract.queryLatestFeeInfo(0);  // 0 = ETH
const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee);

// Submit task with callback set to your contract
const tx = await taskContract.submitTask(
  wallet.address,    // sender (who pays)
  "",                // templateId (can be empty)
  1,                 // attestorCount
  0,                 // tokenSymbol (0 = ETH)
  app.address,       // callback ← YOUR CONTRACT ADDRESS!
  { value: totalFee }
);

const receipt = await tx.wait();
```

### 3. Use Primus SDK for Attestation

```javascript
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');
const primus = new PrimusNetwork();
await primus.init(wallet, 84532);  // Base Sepolia

// Generate attestation
const attestResult = await primus.attest({
  address: wallet.address,
  taskId: taskId,
  taskTxHash: receipt.transactionHash,
  taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
  requests: [{
    url: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
    method: "GET",
    header: {},
    body: ""
  }],
  responseResolves: [[{
    keyName: "btcPrice",
    parseType: "json",  // Required!
    parsePath: "$.data.rates.USD"
  }]]
});

// Wait for result
const taskResult = await primus.verifyAndPollTaskResult({
  taskId: attestResult[0].taskId,
  reportTxHash: attestResult[0].reportTxHash
});
```

### 4. Auto-Callback

When attestation completes, Primus automatically calls:

```solidity
function reportTaskResultCallback(
    bytes32 taskId,
    TaskResult calldata taskResult,
    bool success
) external onlyTask {
    // Your contract processes the attestation
}
```

## Complete Example

See `scripts/deploy-and-test.js` for a complete working example.

## Key Differences

| Approach | SDK Bug? | Callback Works? |
|----------|----------|-----------------|
| `PrimusNetwork.submitTask()` | Yes | No |
| `TaskContract.submitTask()` direct | No | Yes |

## Why This Works

The Primus SDK has two layers:
1. **PrimusNetwork** - JavaScript wrapper (has bug)
2. **TaskContract** - Solidity contract (works correctly)

By calling TaskContract directly, we bypass the buggy wrapper.

## Testing

Run the complete test:
```bash
npx hardhat run scripts/deploy-and-test.js --network baseSepolia
```

This deploys the contract, submits a task, generates attestation, and verifies auto-callback works.
