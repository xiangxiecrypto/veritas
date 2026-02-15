# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         VERITAS PROTOCOL                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐     ┌─────────────────────┐                    │
│  │ IdentityRegistry │     │  PrimusVeritasApp   │                    │
│  │    (ERC-8004)    │     │                     │                    │
│  ├──────────────────┤     ├─────────────────────┤                    │
│  │ • register()     │────→│ • requestVerification()                  │
│  │ • ownerOf()      │     │ • onAttestationComplete()                │
│  │ • tokenURI()     │     │ • rules[]           │                    │
│  └──────────────────┘     └──────────┬──────────┘                    │
│           ↑                          │                                │
│           │                          ↓                                │
│           │              ┌──────────────────────┐                     │
│           │              │  Primus TaskContract │                     │
│           │              │  (zkTLS Attestation) │                     │
│           │              └──────────┬───────────┘                     │
│           │                         │                                 │
│           │                         ↓                                 │
│           │              ┌──────────────────────┐                     │
│           │              │ VeritasValidationRegistry │                │
│           │              ├──────────────────────┤                     │
│           │              │ • validateAttestation()                    │
│           │              │ • URL check          │                     │
│           │              │ • Data check         │                     │
│           │              │ • Freshness check    │                     │
│           │              └──────────┬───────────┘                     │
│           │                         │                                 │
│           │                         ↓                                 │
│           │              ┌──────────────────────┐                     │
│           └─────────────→│ ReputationRegistry   │                     │
│                          │    (ERC-8004)        │                     │
│                          ├──────────────────────┤                     │
│                          │ • giveFeedback()     │                     │
│                          │ • getSummary()       │                     │
│                          └──────────────────────┘                     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Contract Components

### 1. IdentityRegistry (ERC-8004)

**Purpose**: Register and manage agent identities.

**Key Functions**:
| Function | Description |
|----------|-------------|
| `register(agentURI)` | Register new agent, returns agentId |
| `ownerOf(agentId)` | Get agent owner address |
| `tokenURI(agentId)` | Get agent metadata |

**Deployed**: `0x8004A818BFB912233c491871b3d84c89A494BD9e` (Base Sepolia)

### 2. PrimusVeritasApp

**Purpose**: Handle verification requests and Primus integration.

**Key Functions**:
| Function | Description |
|----------|-------------|
| `requestVerification(ruleId, agentId)` | Request attestation (only owner) |
| `onAttestationComplete()` | Callback from Primus |
| `addRule()` | Add new verification rule |

**Security Check**:
```solidity
address agentOwner = identityRegistry.ownerOf(agentId);
require(msg.sender == agentOwner, "Not agent owner");
```

**Deployed**: `0xa70063A1970c9c10d0663610Fe7a02495548ba9b` (Base Sepolia)

### 3. VeritasValidationRegistry

**Purpose**: Pure validation logic for attestations.

**Validation Steps**:
1. Anti-replay check (taskId not used)
2. URL verification (hash match)
3. Data key verification
4. Recipient verification (matches tx.origin)
5. Freshness check (within maxAge)
6. Custom check (app callback)

**Deployed**: `0x0531Cf433aBc7fA52bdD03B7214d522DAB7Db948` (Base Sepolia)

### 4. ReputationRegistry (ERC-8004)

**Purpose**: Store and aggregate reputation scores.

**Key Functions**:
| Function | Description |
|----------|-------------|
| `giveFeedback()` | Grant reputation (called by VeritasValidationRegistry) |
| `getSummary()` | Get aggregated reputation |

**Deployed**: `0x8004B663056A597Dffe9eCcC1965A193B7388713` (Base Sepolia)

### 5. Primus TaskContract

**Purpose**: zkTLS attestation infrastructure (deployed by Primus).

**Key Functions**:
| Function | Description |
|----------|-------------|
| `submitTask()` | Submit attestation request |
| `queryTask()` | Query task result |

**Deployed**: `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` (Base Sepolia)

## Data Flow

```
1. REGISTER
   User → IdentityRegistry.register() → agentId

2. REQUEST
   Agent Owner → PrimusVeritasApp.requestVerification(agentId)
                ↓
                Check: msg.sender == ownerOf(agentId)
                ↓
                PrimusTaskContract.submitTask()
                ↓
                Return taskId

3. ATTEST (Off-chain)
   Primus → Fetch URL (e.g., Coinbase API)
          → Create zkTLS attestation
          → Sign attestation

4. CALLBACK
   Primus → PrimusVeritasApp.onAttestationComplete()
           ↓
           VeritasValidationRegistry.validateAttestation()
           ↓
           ReputationRegistry.giveFeedback()

5. RESULT
   Agent now has on-chain reputation
```

## Verification Rules

Rules define what URLs to attest and reputation scores:

```solidity
struct VerificationRule {
    string url;        // URL to attest
    string dataKey;    // JSON key to verify
    int128 score;      // Reputation points
    uint256 maxAge;    // Freshness requirement
    bool active;       // Rule enabled?
}
```

**Current Rules**:
| ID | URL | Score | Max Age |
|----|-----|-------|---------|
| 0 | Coinbase BTC/USD | 100 | 1 hour |
| 1 | Coinbase ETH/USD | 95 | 2 hours |
