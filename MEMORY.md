# Veritas Protocol

ERC-8004 compliant trust infrastructure for AI agents using Primus zkTLS attestations.

## Two-Step Agent Trust Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: AGENT REGISTRATION (ERC-8004)                          │
│                                                                 │
│  Agent → IdentityRegistry.register() → gets agentId             │
│                                                                 │
│  Contract: 0x8004A818BFB912233c491871b3d84c89A494BD9e           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: BUILD REPUTATION (Primus Attestation)                  │
│                                                                 │
│  Agent → PrimusVeritasApp.requestVerification(agentId)          │
│       → Primus attests → Callback → Reputation granted          │
│                                                                 │
│  ✅ Only registered agents can build reputation                 │
└─────────────────────────────────────────────────────────────────┘
```

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| **IdentityRegistry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| **PrimusVeritasApp** | `0x0560B5dACDc476A1289F8Db7D4760fe1D079FF8e` |
| **VeritasValidationRegistry** | `0x44A607d073c63f975101e271fEe52EDFF78D715d` |
| **ReputationRegistry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| **Primus TaskContract** | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |

**Owner:** `0x89BBf3451643eef216c3A60d5B561c58F0D8adb9`

## Verification Flow

```
User → requestVerification(agentId) → PrimusVeritasApp
                ↓                      ↓
         Check agentId           submitTask(callback=this) → Primus
         registered?                                        ↓
                ↓                                   (zkTLS attestation)
         ❌ Revert if not                        ↓
                                    onAttestationComplete() ← Primus
                                              ↓
                                    VeritasValidationRegistry
                                              ↓
                                    Reputation granted
```

## Key Design

### Agent Registration Check
```solidity
// In PrimusVeritasApp.requestVerification()
identityRegistry.ownerOf(agentId); // Reverts if agent not registered
```

### Primus Interface
```solidity
submitTask(address, string, uint256, uint8, address) // 0x5ae543eb
queryTask(bytes32) // 0x8d3943ec
```

## Rules

| ID | URL | Score | Max Age |
|----|-----|-------|---------|
| 0 | Coinbase BTC rates | 100 | 1h |
| 1 | Coinbase ETH rates | 95 | 2h |

## Files

- `contracts/PrimusVeritasApp.sol` - Main app with agent verification
- `contracts/VeritasValidationRegistry.sol` - Pure validation logic
- `contracts/PrimusTaskInterface.sol` - Primus interface
- `scripts/deploy-veritas-v2.js` - Deployment script

## Deprecated

- `contracts/_deprecated/` - Old contracts
- `scripts/_deprecated/` - Old scripts
- `_archive/` - Old docs
