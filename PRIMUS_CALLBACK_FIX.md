# Primus Auto-Callback Fix

## Overview

This branch implements `PrimusVeritasAppV5` with correct Primus SDK callback support for automatic attestation processing.

## The Problem

Previous versions required manual `submitAttestation()` calls after SDK attestation. The goal was to have Primus automatically call the contract when attestation completes.

## The Solution

`PrimusVeritasAppV5.sol` implements the correct `IPrimusNetworkCallback` interface:

```solidity
function reportTaskResultCallback(
    bytes32 taskId,
    TaskResult calldata taskResult,
    bool success
) external onlyTask
```

Key features:
- Uses `onlyTask` modifier (callback comes from Task contract, not attestor directly)
- Properly handles `TaskResult` struct from Primus
- Automatically validates attestation data and calculates scores
- Stores results in `VeritasValidationRegistryV4`

## SDK Integration Issue

**IMPORTANT:** The Primus SDK (v0.1.8) has a bug where the `callbackAddress` parameter in `submitTask()` is ignored, causing the callback to always be set to `0x0000...`.

### Working SDK Flow (with workaround):

```javascript
const primus = new PrimusNetwork();
await primus.init(wallet, 84532);  // Base Sepolia

// 1. SDK submitTask - creates task structure
// Note: SDK ignores callbackAddress, sets to 0x0000...
const submitResult = await primus.submitTask({
  address: wallet.address,
  templateId: "",  // Can be empty
  attestorCount: 1,
  tokenSymbol: 0,  // ETH
  callbackAddress: appV5.address  // SDK ignores this :(
});

// 2. SDK attest - generates zkTLS proof
const attestResult = await primus.attest({
  address: wallet.address,
  taskId: submitResult.taskId,
  taskTxHash: submitResult.taskTxHash,
  taskAttestors: submitResult.taskAttestors,
  requests: [{ 
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    method: 'GET'
  }],
  responseResolves: [[{
    keyName: 'btcPrice',
    parseType: 'json',  // Required!
    parsePath: '$.data.rates.USD'
  }]]
});

// 3. Poll for result
const taskResult = await primus.verifyAndPollTaskResult({
  taskId: attestResult[0].taskId,
  reportTxHash: attestResult[0].reportTxHash
});

// 4. Manual submission (SDK bug workaround)
await appV5.processAttestation(
  taskId,
  attestation.data,
  timestamp,
  ruleId
);
```

## Files Added

### Contracts
- `PrimusVeritasAppV5.sol` - Main contract with callback interface
- `IPrimus.sol` - Shared Primus interfaces (TaskResult, Attestation, etc.)
- `MockPrimusTask.sol` - For local Hardhat testing
- `PriceRangeCheckV2.sol` - Custom validation checks

### Scripts
- `deploy-and-test-v5.js` - Deployment and testing
- `test-v5-local.js` - Local Hardhat tests
- `debug-primus-sdk.js` - SDK parameter debugging
- `check-callback-status.js` - Monitor callback status

### Documentation
- `PRIMUS_CALLBACK_FIX.md` - This file
- `PRIMUS_SDK_ANALYSIS.md` - Detailed SDK bug analysis

## Testing

### Local Tests (Hardhat)
```bash
npx hardhat test scripts/test-v5-local.js
```

All tests pass:
- ✅ Callback restricted to Task contract
- ✅ TaskResult struct properly handled
- ✅ Automatic validation on callback works
- ✅ Score calculation correct (0-100)
- ✅ Duplicate processing prevented
- ✅ Unauthorized callbacks rejected

### Base Sepolia Deployment
```bash
npx hardhat run scripts/deploy-and-test-v5.js --network baseSepolia
```

Recent deployments:
- AppV5: `0x924b3f01C5889259bff175507917bA0B607842B6`
- AppV5: `0x3114776b136dCe2360fA33AD5442684A6c1b2e06`

## Known Issues

1. **SDK Bug**: `callbackAddress` parameter ignored in `submitTask()`
   - Status: Reported to Primus team
   - Workaround: Use manual `processAttestation()` submission

2. **Auto-callback**: Requires SDK fix to work automatically
   - Current: Manual submission after SDK attestation
   - Future: Auto-callback when SDK fixed

## Next Steps

1. Wait for Primus SDK fix for `callbackAddress` parameter
2. Once fixed, auto-callback will work without manual submission
3. Contract is ready and tested - just needs SDK update

## References

- Primus SDK Example: https://github.com/primus-labs/zktls-demo/blob/main/network-core-sdk-example/index.js
- Base Sepolia Explorer: https://sepolia.basescan.org
- Primus Task Contract: `0xC02234058caEaA9416506eABf6Ef3122fCA939E8`
