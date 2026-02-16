# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         VERITAS PROTOCOL                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐     ┌─────────────────────┐                    │
│  │ IdentityRegistry │     │ PrimusVeritasAppV2  │                    │
│  │    (ERC-8004)    │     │                     │                    │
│  ├──────────────────┤     ├─────────────────────┤                    │
│  │ • register()     │────→│ • requestVerification()                  │
│  │ • ownerOf()      │     │ • submitAttestation()│                    │
│  │ • tokenURI()     │     │ • rules[]           │                    │
│  └──────────────────┘     └──────────┬──────────┘                    │
│           ↑                          │                                │
│           │                          ↓                                │
│           │              ┌──────────────────────┐                     │
│  Agent Identity          │  Primus TaskContract │                     │
│  (ERC-8004 NFT)          │  (zkTLS Attestation) │                     │
│                          └──────────┬───────────┘                     │
│                                     │                                 │
│                          ┌──────────┴───────────┐                     │
│                          │   SDK.attest()       │                     │
│                          │   (Off-chain zkTLS)  │                     │
│                          └──────────────────────┘                     │
│                                     │                                 │
│                                     ↓                                 │
│                          ┌──────────────────────┐                     │
│                          │VeritasValidationRegV2│                     │
│                          ├──────────────────────┤                     │
│                          │ • validateAttestation()                    │
│                          │ • URL hash check     │                     │
│                          │ • Data key extraction│                     │
│                          └──────────┬───────────┘                     │
│                                     │                                 │
│                                     ↓                                 │
│                          ┌──────────────────────┐                     │
│                          │  ReputationRegistry  │                     │
│                          │      (ERC-8004)      │                     │
│                          ├──────────────────────┤                     │
│                          │ • giveFeedback()     │                     │
│                          │ • Agent reputation   │                     │
│                          └──────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────┘
```

## Contract Addresses (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | ERC-8004 agent identity |
| PrimusVeritasAppV2 | `0x0552bD6434D79073d1167BC39d4D01f6c3333F6e` | Verification app |
| VeritasValidationRegistryV2 | `0xF18C120B0cc018c0862eDaE6B89AB2485FD35EE3` | Validation logic |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Reputation storage |
| Primus TaskContract | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` | zkTLS infrastructure |

## Data Flow

### Step 1: Identity Registration
```
User → IdentityRegistry.register(name, metadata) → agentId (NFT)
```

### Step 2: Verification Request
```
Agent Owner → PrimusVeritasAppV2.requestVerification(ruleId, agentId)
           → PrimusTask.submitTask(callback=App)
           → taskId
```

### Step 3: Attestation (Off-Chain)
```
SDK → Primus Network (Phala TEE)
    → HTTPS request to target URL
    → zkTLS proof generation
    → Attestation data stored on-chain
```

### Step 4: Submit Attestation
```
User → PrimusVeritasAppV2.submitAttestation(taskId, url, data, timestamp)
    → queryTask() verification
    → ValidationRegistry.validateAttestation()
    → ReputationRegistry.giveFeedback()
    → Reputation granted!
```

## Security Model

### Ownership Verification
```solidity
// Only agent owner can request verification
address agentOwner = IdentityRegistry.ownerOf(agentId);
require(msg.sender == agentOwner, "Not agent owner");
```

### Attestation Validation
```solidity
// Verify attestation comes from Primus
TaskInfo memory taskInfo = primusTask.queryTask(taskId);
require(taskInfo.taskStatus == 1, "Task not completed");
require(taskInfo.callback == address(this), "Not our task");

// Verify URL matches
require(keccak256(bytes(taskInfo.templateId)) == keccak256(bytes(url)));

// Verify data matches
require(keccak256(bytes(att.data)) == keccak256(bytes(data)));
```

### Data Key Extraction
```solidity
// Extract value from JSON using dataKey
// e.g., {"btcPrice":"68164.45"} with key "btcPrice" → 68164.45
require(_containsDataKey(data, key), "Data key not found");
```

## Key Design Decisions

### 1. Manual Attestation Submission (Current)
Currently, Primus does NOT automatically call back to contracts after `SDK.attest()` completes. We manually submit attestation data via `submitAttestation()`.

**Why?** Primus testnet callback mechanism not yet confirmed. Will be improved.

**Future:** Auto-callback from Primus after attestation completion (no manual step).

### 2. Callback Address is Informational
The `callback` parameter in `submitTask()` is stored but not used by Primus. We use `queryTask()` to verify instead.

### 3. URL in templateId
The attestation URL is in `taskInfo.templateId`, not `attestation.request` (which is empty).

### 4. Data Key Matching
The rule's `dataKey` must match SDK's `keyName` exactly:
- Rule: `dataKey = "btcPrice"`
- SDK: `keyName = "btcPrice"`

### 5. Exact Fee
Primus requires exactly 10^10 wei (0.00000001 ETH). Any deviation fails.

## Gas Costs

| Function | Gas (approx) |
|----------|--------------|
| requestVerification | ~250,000 |
| submitAttestation | ~380,000 |
| Total per verification | ~630,000 |

## File Structure

```
contracts/
├── IVeritasApp.sol              # Interface for custom checks
├── PrimusTaskInterface.sol      # Primus TaskContract interface
├── PrimusVeritasAppV2.sol       # Main verification app
└── VeritasValidationRegistryV2.sol # Validation logic

scripts/
└── deploy-app-v2.js             # Deployment script

src/
└── sdk.ts                       # TypeScript SDK
```
