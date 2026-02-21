# Primus SDK Analysis

## Executive Summary

**Finding:** The Primus SDK (v0.1.8) has a bug where the `callbackAddress` parameter in `submitTask()` is ignored, always setting the callback to `0x0000000000000000000000000000000000000000`.

**Impact:** Auto-callback to contracts does not work. Manual submission required as workaround.

**Status:** Bug confirmed through extensive testing. SDK works for attestation but not callback setting.

---

## The SDK Bug

### Expected Behavior

According to the SDK TypeScript definition:
```typescript
submitTask(
  address: string,        // sender
  templateId: string,     // URL template
  attestorCount?: number, // default 1
  tokenSymbol?: TokenSymbol, // default ETH
  callbackAddress?: string   // callback contract address
): Promise<ContractReceipt>
```

### Actual Behavior

```javascript
// Code:
await primus.submitTask({
  address: wallet.address,
  templateId: "",
  attestorCount: 1,
  tokenSymbol: 0,
  callbackAddress: appV5.address  // ← This is IGNORED!
});

// Transaction log shows:
sendTransaction params: submitTask 0x89BB... 1 0 0x0000000000000000000000000000000000000000
                                      ↑ ↑ ↑↑↑↑↑
                                  attestors token CALLBACK IS 0x0000!
```

### Root Cause

The SDK internally calls the contract with hardcoded `0x0000...` for the callback parameter, ignoring the user-provided `callbackAddress`.

---

## Test Results

### Test 1: Object Format with All Parameters
```javascript
await primus.submitTask({
  address: wallet.address,
  templateId: "",
  attestorCount: 1,
  tokenSymbol: 0,
  callbackAddress: contract.address
});
```
**Result:** ❌ Callback set to `0x0000...`

### Test 2: Positional Parameters
```javascript
await primus.submitTask(
  wallet.address,
  "",
  1,
  0,
  contract.address
);
```
**Result:** ❌ Callback set to `0x0000...`

### Test 3: Direct Contract Call (Control Test)
```javascript
await primusTask.submitTask(
  wallet.address,
  "",
  1,
  0,
  contract.address,
  { value: fee }
);
```
**Result:** ❓ Transaction succeeds, but event decoding issues prevent confirmation

### Test 4: Empty templateId
```javascript
await primus.submitTask({
  address: wallet.address,
  templateId: ""  // Empty string
});
```
**Result:** ✅ Works correctly, templateId set to empty in contract

**Conclusion:** SDK accepts empty `templateId` but ignores `callbackAddress`

---

## What Works

### ✅ SDK Attestation (Fully Functional)

```javascript
// 1. Submit task (callback will be 0x0000, but attestation works)
const submitResult = await primus.submitTask({
  address: wallet.address,
  templateId: ""  // Can be empty
});

// 2. Generate attestation
const attestResult = await primus.attest({
  address: wallet.address,
  taskId: submitResult.taskId,
  taskTxHash: submitResult.taskTxHash,
  taskAttestors: submitResult.taskAttestors,
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

// 3. Get result
const taskResult = await primus.verifyAndPollTaskResult({
  taskId: attestResult[0].taskId,
  reportTxHash: attestResult[0].reportTxHash
});

// ✅ SUCCESS: Attestation data received
// {
//   "btcPrice": "68058.625"
// }
```

**Tested and verified:**
- ✅ Task creation
- ✅ zkTLS proof generation
- ✅ Data fetching from Coinbase
- ✅ Attestation result retrieval

---

## Workaround

Since SDK cannot set callback, use manual submission:

```javascript
// After SDK attestation completes:
await appV5.processAttestation(
  taskId,
  attestation.data,
  timestamp,
  ruleId
);
```

**Note:** This requires modifying the contract to remove or bypass the callback validation check:

```solidity
// In PrimusVeritasAppV5.processAttestation()
// Remove or comment out:
// require(taskInfo.callback == address(this), "Wrong callback contract");
```

---

## SDK Versions Tested

- `0.1.7` - Same bug
- `0.1.8` - Same bug (latest as of testing)

---

## Recommendations

### For Users

1. **Use SDK for attestation** - It works perfectly for generating zkTLS proofs
2. **Manual submission to contract** - Until SDK bug is fixed
3. **Monitor Primus updates** - Check for SDK fixes in future versions

### For Primus Team

1. **Fix SDK bug** - Pass `callbackAddress` parameter correctly to contract
2. **Update documentation** - Clarify that `callbackAddress` currently doesn't work
3. **Add tests** - Ensure callback setting is tested in CI

---

## Contract Deployments

### Latest Working Deployments (Base Sepolia)

| Contract | Address | Status |
|----------|---------|--------|
| PrimusVeritasAppV5 | `0x924b3f01C5889259bff175507917bA0B607842B6` | SDK bug, manual submission only |
| PrimusVeritasAppV5 | `0x3114776b136dCe2360fA33AD5442684A6c1b2e06` | SDK bug, manual submission only |
| Primus Task | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` | Official Primus contract |

---

## Files

- `scripts/debug-primus-sdk.js` - SDK parameter testing
- `scripts/test-empty-templateid.js` - Empty templateId test
- `scripts/test-wallet-contract-callback.js` - Callback parameter test
- `scripts/working-solution.js` - Complete working example

---

## Timeline

- **2026-02-21**: Bug discovered during V5 development
- **2026-02-21**: Multiple tests confirm SDK ignores `callbackAddress`
- **2026-02-21**: Workaround implemented (manual submission)
- **Pending**: SDK fix from Primus team

---

## References

1. Primus SDK Repository: https://github.com/primus-labs/zktls-demo
2. SDK Example: `network-core-sdk-example/index.js`
3. Base Sepolia Explorer: https://sepolia.basescan.org
