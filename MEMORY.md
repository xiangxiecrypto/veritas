# Veritas Protocol

ERC-8004 compliant trust infrastructure using Primus zkTLS attestations.

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| **PrimusVeritasApp** | `0x0560B5dACDc476A1289F8Db7D4760fe1D079FF8e` |
| **VeritasValidationRegistry** | `0x44A607d073c63f975101e271fEe52EDFF78D715d` |
| Primus TaskContract | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |
| Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

**Owner:** `0x89BBf3451643eef216c3A60d5B561c58F0D8adb9`

## Flow

```
User → requestVerification() → PrimusVeritasApp
                                     ↓
                          submitTask(callback=this) → Primus
                                                           ↓
                          onAttestationComplete() ← Primus callback
                                     ↓
                          VeritasValidationRegistry validates
                                     ↓
                          Reputation granted automatically
```

## Primus Interface

```solidity
submitTask(address, string, uint256, uint8, address) // 0x5ae543eb
queryTask(bytes32) // 0x8d3943ec
```

## Rules

| ID | URL | Score | Max Age |
|----|-----|-------|---------|
| 0 | Coinbase BTC rates | 100 | 1h |
| 1 | Coinbase ETH rates | 95 | 2h |

## Test Transaction

- Hash: `0x51635a6e58c51e4ee3b242b5d23536b9c8b70655277f7345b43135ae60f5c06b`

## Deprecated

- `contracts/_deprecated/` - Old contracts
- `scripts/_deprecated/` - Old scripts
- `_archive/` - Old docs
