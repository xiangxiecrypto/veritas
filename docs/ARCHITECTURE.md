# Veritas Protocol Architecture

## Overview

Veritas Protocol enables AI agents to build verifiable reputation using Primus zkTLS attestations.

## Core Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VERITAS PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌───────────────────┐                     │
│  │  PrimusVeritasApp │     │  TaskContract      │                     │
│  │                  │────→│  (Primus)          │                     │
│  │ • requestValidation()   │  • submitTask()    │                     │
│  │ • reportTaskResultCallback()              │                     │
│  │ • rules[]         │     │  • attest()        │                     │
│  └────────┬─────────┘     └─────────┬──────────┘                     │
│           │                         │                                │
│           │              ┌──────────┴──────────┐                     │
│           │              │   SDK.attest()      │                     │
│           │              │   (Off-chain zkTLS) │                     │
│           │              └──────────┬──────────┘                     │
│           │                         │                                │
│           ↓                         ↓                                │
│  ┌──────────────────┐     ┌───────────────────┐                     │
│  │VeritasValidation │     │  Custom Checks    │                     │
│  │    Registry      │     │  • PriceRangeCheck│                     │
│  │                  │     │  • ThresholdCheck │                     │
│  │ • validationResponse()                   │                     │
│  │ • scores[]       │     └───────────────────┘                     │
│  └──────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘

## Key Contracts

### PrimusVeritasApp.sol
Main application contract that:
- Implements `IPrimusNetworkCallback` for auto-callback
- Manages verification rules
- Runs custom checks on attestation data
- Submits results to VeritasValidationRegistry

### VeritasValidationRegistry.sol
Stores validation results:
- Maps taskId → validation info
- Records scores (0-100)
- Tracks validator and agent IDs

### Custom Checks (checks/ folder)
- **PriceRangeCheck**: Validates numeric values within ranges
- **ThresholdCheck**: Validates against thresholds

## Flow

1. **Deploy**: Deploy PrimusVeritasApp with Registry and Primus Task addresses
2. **Add Rules**: Define verification rules (URL, data key, checks)
3. **Submit Task**: Call TaskContract.submitTask() directly with callback = PrimusVeritasApp
4. **Attest**: Use Primus SDK to generate zkTLS proof
5. **Auto-Callback**: Primus calls reportTaskResultCallback() automatically
6. **Validate**: Contract runs checks and calculates score
7. **Store**: Results saved to VeritasValidationRegistry

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| Primus Task | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |
| VeritasValidationRegistry | `0x257DC4B38066840769EeA370204AD3724ddb0836` |

## Implementation Notes

### Direct TaskContract Calls
The Primus SDK's `PrimusNetwork.submitTask()` has a bug where `callbackAddress` is ignored. Solution: Call `TaskContract.submitTask()` directly using ethers.js:

```javascript
const taskContract = new ethers.Contract(PRIMUS_TASK, TASK_ABI, wallet);
await taskContract.submitTask(
  wallet.address,  // sender
  "",              // templateId
  1,               // attestorCount
  0,               // tokenSymbol (ETH)
  app.address,     // callback ← Set correctly!
  { value: fee }
);
```

This bypasses the SDK bug and enables auto-callback functionality.
