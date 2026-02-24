# Veritas Protocol Architecture

## Overview

Veritas Protocol provides on-chain verification of API attestations using Primus zkTLS. The system consists of three main components:

1. **VeritasSDK** - TypeScript SDK for easy integration
2. **PrimusVeritasApp** - Smart contract that coordinates validation
3. **Custom Checks** - Pluggable validation logic

## Components

### 1. VeritasSDK (TypeScript)

The SDK wraps Primus SDK with higher-level abstractions:

```javascript
const sdk = new VeritasSDK();
await sdk.init(signer);

// Agent management
await sdk.registerAgent();
await sdk.getAgentInfo(agentId);

// Validation
await sdk.validate({ agentId, ruleId, checkIds, request, responseResolves });
```

### 2. PrimusVeritasApp (Solidity)

Main contract that handles:
- Rule management (API endpoints to validate)
- Check management (validation logic contracts)
- Attestation verification
- Auto-callback to ReputationRegistry

### 3. Custom Checks (Solidity)

Implement `ICustomCheck` interface:

```solidity
function validate(
    bytes calldata request,
    bytes calldata responseResolve,
    bytes calldata attestationData,
    string calldata url,
    string calldata dataKey,
    string calldata parsePath,
    bytes calldata params
) external returns (bool);
```

## Validation Flow

```
┌──────────────┐
│ 1. Register  │ Agent gets ERC-8004 identity
│    Agent     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 2. Request   │ Call validate() with Primus-style params
│  Validation  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 3. Primus    │ Off-chain zkTLS attestation
│  Attestation │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 4. Auto      │ On-chain verification + reputation update
│  Callback    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 5. Complete  │ Agent reputation score updated
└──────────────┘
```

## Contract Addresses (Base Sepolia)

| Contract | Purpose |
|----------|---------|
| PrimusVeritasApp | Main validation contract |
| IdentityRegistry | ERC-8004 agent identity |
| ValidationRegistry | Validation history storage |
| ReputationRegistry | Agent reputation scores |
| SimpleVerificationCheck | Generic URL/dataKey validation |
| MoltbookKarmaCheck | Moltbook karma validation |

## Gas Optimization

- Custom checks use `{gas: 100000}` for interface calls
- Struct packing for efficient storage
- Events for off-chain indexing

## Security Considerations

1. **Attestation Verification** - All attestations verified via Primus TaskContract
2. **Timestamp Validation** - Prevents replay attacks with maxAge
3. **Owner Verification** - Only agent owner can request validation
4. **Check Isolation** - Each check is an isolated contract
