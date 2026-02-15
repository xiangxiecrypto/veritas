# Veritas Protocol - Primus zkTLS Integration

Trustless on-chain verification of web data using Primus zkTLS attestations.

## 📋 Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| **PrimusVeritasApp** | [`0x0560B5dACDc476A1289F8Db7D4760fe1D079FF8e`](https://sepolia.basescan.org/address/0x0560B5dACDc476A1289F8Db7D4760fe1D079FF8e) |
| **VeritasValidationRegistry** | [`0x44A607d073c63f975101e271fEe52EDFF78D715d`](https://sepolia.basescan.org/address/0x44A607d073c63f975101e271fEe52EDFF78D715d) |
| **Primus TaskContract** | [`0xC02234058caEaA9416506eABf6Ef3122fCA939E8`](https://sepolia.basescan.org/address/0xC02234058caEaA9416506eABf6Ef3122fCA939E8) |
| **Reputation Registry** | [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://sepolia.basescan.org/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) |

## 🏗️ Architecture

```
┌─────────┐     requestVerification()     ┌──────────────────┐
│         │ ──────────────────────────────▶                  │
│   USER  │                                │ PrimusVeritasApp │
│         │ ◀──────────────────────────────│                  │
└─────────┘     taskId returned            └────────┬─────────┘
                                                    │
                         submitTask(callback=this)  │
                                                    ▼
                                          ┌──────────────────┐
                                          │ Primus TaskContract│
                                          │                    │
                                          │ 1. Create task     │
                                          │ 2. zkTLS attests   │
                                          │ 3. Call callback   │
                                          └────────┬─────────┘
                                                   │
                         onAttestationComplete()   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PrimusVeritasApp                               │
│                                                                      │
│  • Verify caller is Primus                                          │
│  • Extract attestation data                                          │
│  • Call Registry.validateAttestation()                               │
└──────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   VeritasValidationRegistry                          │
│                                                                      │
│  Validation Checks:                                                  │
│  1. ✅ Anti-Replay (taskId not used)                                │
│  2. ✅ URL Match (hash comparison)                                  │
│  3. ✅ Data Key (exists in attestation)                             │
│  4. ✅ Recipient (matches tx.origin)                                │
│  5. ✅ Freshness (not expired)                                      │
│  6. ✅ Custom Check (app callback)                                  │
│  7. ✅ Grant Reputation                                              │
└──────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │ Reputation System│
                                          │   (ERC-8004)     │
                                          └──────────────────┘
```

## 🚀 Quick Start

### Request Verification

```javascript
const app = new ethers.Contract(APP_ADDRESS, ABI, wallet);

// One function call - everything else is automatic!
const tx = await app.requestVerification(
    0,      // ruleId (0 = BTC/USD, 1 = ETH/USD)
    12345,  // agentId (who gets reputation)
    { value: ethers.utils.parseEther("0.00000001") }
);

const receipt = await tx.wait();
// taskId is returned - Primus will call back automatically
```

### Add New Rule

```javascript
await app.addRule(
    "https://api.example.com/data",  // URL to verify
    "data.value",                     // JSON key to check
    100,                              // reputation score
    0,                                // decimals
    3600,                             // maxAge (seconds)
    "Example Rule"                    // description
);
```

## 📁 Contract Files

| File | Description |
|------|-------------|
| `PrimusVeritasApp.sol` | Main app with callback pattern |
| `VeritasValidationRegistry.sol` | Pure validation logic |
| `PrimusTaskInterface.sol` | Official Primus interface |
| `IVeritasApp.sol` | App interface for callback |

## 🔧 Deployment

```bash
# Compile
npx hardhat compile

# Deploy to Base Sepolia
npx hardhat run scripts/deploy-veritas-new-arch.js --network baseSepolia
```

## 📊 Current Rules

| ID | URL | Data Key | Score | Max Age |
|----|-----|----------|-------|---------|
| 0 | Coinbase BTC/USD | data.rates.USD | 100 | 1 hour |
| 1 | Coinbase ETH/USD | data.rates.USD | 95 | 2 hours |

## 🔗 Links

- **Primus Network**: https://primus.xyz
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **ERC-8004**: https://eips.ethereum.org/EIPS/eip-8004

## 📝 Key Features

1. **Callback Pattern**: Primus automatically calls back when attestation is ready
2. **No User Action Needed**: User only calls `requestVerification()` once
3. **Pure Validation**: Registry has no dependencies, just validates data
4. **Gas Optimized**: Uses URL hash for efficient comparison

## 🔐 Security

- Only Primus TaskContract can call the callback function
- Anti-replay protection via taskId tracking
- Recipient must match tx.origin
- Attestation must be fresh (within maxAge)

## 📜 License

MIT
