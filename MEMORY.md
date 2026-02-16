# Veritas Protocol

**Build trust for AI agents with ERC-8004.**

Veritas combines ERC-8004 agent identity with Primus zkTLS attestations to build verifiable reputation for AI agents.

## Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **IdentityRegistry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Register agent identities (ERC-8004) |
| **PrimusVeritasAppV2** | `0x0552bD6434D79073d1167BC39d4D01f6c3333F6e` | Verification app with SDK integration |
| **VeritasValidationRegistryV2** | `0xF18C120B0cc018c0862eDaE6B89AB2485FD35EE3` | Validate attestations |
| **ReputationRegistry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Store reputation scores |
| **Primus TaskContract** | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` | Primus zkTLS infrastructure |

**Owner:** `0x89BBf3451643eef216c3A60d5B561c58F0D8adb9`

## Two-Step Flow

```
STEP 1: REGISTER IDENTITY (ERC-8004)
  Agent → IdentityRegistry.register() → gets agentId

STEP 2: BUILD REPUTATION (SDK Integration)
  1. requestVerification(ruleId, agentId) → submits to Primus
  2. SDK.attest() → zkTLS attestation (off-chain)
  3. submitAttestation() → validates & grants reputation
```

## Verification Rules

| ID | URL | Data Key | Score | Max Age |
|----|-----|----------|-------|---------|
| 0 | Coinbase BTC/USD | `data.rates.USD` | 100 | 1h |
| 1 | Coinbase ETH/USD | `data.rates.USD` | 95 | 2h |
| 2 | Coinbase BTC/USD | `btcPrice` | 100 | 1h |

**Working Rule:** Rule 2 with `dataKey="btcPrice"` (matches SDK keyName)

## SDK Usage

```javascript
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

// Step 1: Request verification
const tx = await app.requestVerification(2, agentId, { value: ethers.BigNumber.from('10000000000') });

// Step 2: Attest via SDK
const primus = new PrimusNetwork();
await primus.init(wallet, 84532);

const result = await primus.attest({
  taskId,
  taskTxHash: tx.hash,
  taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
  requests: [{ url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', method: 'GET' }],
  responseResolves: [[{ keyName: 'btcPrice', parsePath: '$.data.rates.USD' }]]  // Array of arrays!
}, 60000);

// Step 3: Submit attestation
await app.submitAttestation(taskId, url, result[0].attestation.data, timestamp);
```

## Current Limitation

⚠️ **No auto-callback from Primus** - Currently requires manual `submitAttestation()` after SDK.attest().

**Future improvement:** Auto-callback from Primus after attestation completion (no manual step needed).

## Critical Details

1. **Manual submission required** - Call `submitAttestation()` after SDK.attest()
2. **SDK responseResolves** must be `[[{...}]]` (array of arrays)
3. **URL is in `taskInfo.templateId`**, not `attestation.request`
4. **dataKey must match SDK keyName** (e.g., `"btcPrice"`)
5. **Fee is exactly 10^10 wei** = 0.00000001 ETH
6. **Timestamp is in seconds** for contract, milliseconds from SDK

## Test Results

- Tx: `0x8a6741e799b5dd04bb6e6945a2f6f15d72041749ca30ac3ea7391d1ee4a159fa`
- Agent ID: 674, Score: 100 ✅
- Event: `VerificationCompleted` emitted successfully

## Files

```
contracts/
  IVeritasApp.sol              - Interface
  PrimusTaskInterface.sol      - Primus interface
  PrimusVeritasAppV2.sol       - Main app (current)
  VeritasValidationRegistryV2.sol - Validation logic (current)
  _deprecated/                 - Old versions

scripts/
  deploy-app-v2.js             - Deployment script
  _deprecated/                 - Old scripts

src/
  sdk.ts                       - TypeScript SDK
```

## Links

- [Flow Details](./FLOW_DETAILS.md) - Complete technical documentation
- [Explorer](https://sepolia.basescan.org/address/0x0552bD6434D79073d1167BC39d4D01f6c3333F6e)
