# Veritas Protocol - Primus Integration

## Latest Deployment (Feb 15, 2026)

### Contracts (Base Sepolia)

| Contract | Address | Link |
|----------|---------|------|
| **PrimusVeritasApp** | `0x0560B5dACDc476A1289F8Db7D4760fe1D079FF8e` | [Basescan](https://sepolia.basescan.org/address/0x0560B5dACDc476A1289F8Db7D4760fe1D079FF8e) |
| **VeritasValidationRegistry** | `0x44A607d073c63f975101e271fEe52EDFF78D715d` | [Basescan](https://sepolia.basescan.org/address/0x44A607d073c63f975101e271fEe52EDFF78D715d) |
| **Primus TaskContract** | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` | [Basescan](https://sepolia.basescan.org/address/0xC02234058caEaA9416506eABf6Ef3122fCA939E8) |
| **Reputation Registry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | [Basescan](https://sepolia.basescan.org/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) |

### Architecture

```
User → requestVerification() → PrimusVeritasApp
                                     ↓
                          submitTask(callback=this) → Primus
                                                           ↓
                                        (Primus attests off-chain)
                                                           ↓
                          onAttestationComplete() ← Primus calls back
                                     ↓
                          VeritasValidationRegistry validates
                                     ↓
                          Reputation granted (automatic)
```

### Key Design Decisions

1. **Callback Pattern**: User only calls `requestVerification()` once. Primus calls back automatically when attestation is ready.

2. **Correct Primus Interface**:
   - `submitTask(address, string, uint256, uint8, address)` - Selector: `0x5ae543eb`
   - `queryTask(bytes32)` - Selector: `0x8d3943ec`

3. **Separation of Concerns**:
   - `PrimusVeritasApp`: Handles Primus integration
   - `VeritasValidationRegistry`: Pure validation logic (no dependencies)

### Test Transaction

- Hash: `0x51635a6e58c51e4ee3b242b5d23536b9c8b70655277f7345b43135ae60f5c06b`
- Task ID: `0x6f964b3fafef5accd6b83c368d017f7fb9fbad1de9440a75e7b0113ca0affc84`
- [View on Basescan](https://sepolia.basescan.org/tx/0x51635a6e58c51e4ee3b242b5d23536b9c8b70655277f7345b43135ae60f5c06b)

### Current Rules

| ID | URL | Score | Max Age |
|----|-----|-------|---------|
| 0 | https://api.coinbase.com/v2/exchange-rates?currency=BTC | 100 | 3600s |
| 1 | https://api.coinbase.com/v2/exchange-rates?currency=ETH | 95 | 7200s |

### Owner

`0x89BBf3451643eef216c3A60d5B561c58F0D8adb9`

---

## History

### Feb 15, 2026 - Callback Pattern Deployment
- Fixed Primus interface (correct selector: `0x5ae543eb`)
- Implemented callback pattern (Primus calls `onAttestationComplete()`)
- Removed need for user to call `completeVerification()`
- Deployed new contracts with correct architecture

### Feb 14, 2026 - Interface Fix
- Discovered Primus interface was wrong
- Correct interface: `submitTask(address,string,uint256,uint8,address)`
- Old interface used: `submitTask(string,address[],requests[],string,string)`
- Created `PrimusTaskInterface.sol` with correct interface

---

## Files

### Active Contracts
- `contracts/PrimusVeritasApp.sol` - Main app with callback
- `contracts/VeritasValidationRegistry.sol` - Validation logic
- `contracts/PrimusTaskInterface.sol` - Official Primus interface
- `contracts/IVeritasApp.sol` - App interface

### Active Scripts
- `scripts/deploy-veritas-new-arch.js` - Deployment script
- `scripts/verify-primus-interface.js` - Interface verification
- `scripts/real-complete-test.js` - Complete test script
- `scripts/complete-primus-test.js` - Detailed test

### Deprecated
- `contracts/_deprecated/` - Old contracts
- `scripts/_deprecated/` - Old scripts
