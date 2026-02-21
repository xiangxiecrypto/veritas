# Veritas Protocol

Complete implementation of Primus zkTLS auto-callback for AI agent reputation.

## Overview

Veritas Protocol enables AI agents to build verifiable reputation using Primus zkTLS attestations. The protocol automatically processes attestations when Primus completes verification.

## Architecture

```
User
  │
  ├─ Deploy PrimusVeritasApp
  │
  ├─ Call TaskContract.submitTask() directly
  │  ├─ Sets callback = PrimusVeritasApp address
  │  └─ Returns taskId
  │
  ├─ Use Primus SDK attest()
  │  └─ Generates zkTLS proof
  │
  └─ Primus calls reportTaskResultCallback()
     └─ Contract processes attestation automatically
```

## Why Direct TaskContract Calls?

The Primus SDK's `PrimusNetwork.submitTask()` has a bug where `callbackAddress` is ignored. By calling `TaskContract.submitTask()` directly with ethers.js, the callback is set correctly and auto-callback works.

## Files

### Core Contracts

| File | Purpose |
|------|---------|
| `PrimusVeritasApp.sol` | Main contract with auto-callback support |
| `VeritasValidationRegistry.sol` | Stores validation results |
| `IPrimus.sol` | Primus interface definitions |
| `PriceRangeCheckV2.sol` | Price validation check |

### Scripts

| File | Purpose |
|------|---------|
| `deploy-and-test.js` | Complete deployment and testing |

## Usage

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env`:
```
PRIVATE_KEY=your_private_key
```

### 3. Deploy and Test

```bash
npx hardhat run scripts/deploy-and-test.js --network baseSepolia
```

This will:
1. Deploy `PrimusVeritasAppV5`
2. Add verification rules
3. Submit task to Primus (direct TaskContract call)
4. Generate attestation using Primus SDK
5. Wait for auto-callback
6. Verify contract processed the attestation

## Key Implementation

### Direct TaskContract Call

```javascript
const TASK_ABI = [
  "function submitTask(address,string,uint256,uint8,address) payable returns (bytes32)",
  "function queryLatestFeeInfo(uint8) view returns (tuple(uint256,uint256))"
];

const taskContract = new ethers.Contract(PRIMUS_TASK, TASK_ABI, wallet);

// Get fee
const feeInfo = await taskContract.queryLatestFeeInfo(0);
const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee);

// Submit task with correct callback!
const tx = await taskContract.submitTask(
  wallet.address,  // sender
  "",              // templateId
  1,               // attestorCount
  0,               // tokenSymbol (ETH)
  app.address,     // callback ← SET CORRECTLY!
  { value: totalFee }
);
```

### Auto-Callback Handler

```solidity
function reportTaskResultCallback(
    bytes32 taskId,
    TaskResult calldata taskResult,
    bool success
) external onlyTask {
    // Automatically called by Primus when attestation completes
    // Processes attestation and calculates score
}
```

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| Primus Task | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |
| Registry | `0x257DC4B38066840769EeA370204AD3724ddb0836` |

## How It Works

1. **Deploy**: Deploy `PrimusVeritasAppV5` with Registry and Primus Task addresses
2. **Add Rules**: Define verification rules (e.g., BTC price between $60k-$100k)
3. **Submit Task**: Call `TaskContract.submitTask()` directly with your contract as callback
4. **Attest**: Use Primus SDK to generate zkTLS proof
5. **Auto-Process**: Primus automatically calls your contract's callback function
6. **Score**: Contract validates data and calculates reputation score

## Testing

Local tests verify:
- ✅ Callback restricted to Task contract only
- ✅ TaskResult struct properly handled
- ✅ Automatic validation works
- ✅ Score calculation (0-100)
- ✅ Duplicate prevention
- ✅ Unauthorized access blocked

Run tests:
```bash
npx hardhat test
```

## Documentation

See `docs/` for detailed technical documentation.

## License

MIT
