# Veritas Protocol

**Build trust for AI agents with ERC-8004.**

Veritas combines ERC-8004 agent identity with Primus zkTLS attestations to build verifiable reputation for AI agents.

## Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **VeritasValidationRegistry** | `0xAeFdE0707014b6540128d3835126b53F073fEd40` | ERC-8004 compliant validation registry |
| **PrimusVeritasApp** | `0xa21CC240ed059eC4b31e45559865Af73C0CCA6Da` | Verification app with Primus SDK |
| **FollowerThresholdCheck** | `0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52` | Generic follower threshold check |
| **Identity Registry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Existing ERC-8004 identity registry |
| **Primus TaskContract** | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` | Primus zkTLS infrastructure |

**Latest Deployments (2026-02-22):**

**VeritasValidationRegistry:**
- Tx: `0xe174624eb5471c3b33a6312b589556cf346b508191c022643f00f526c3dfdd63`
- Address: `0x54be2Ce61135864D9a3c28877ab12758d027b520`
- Explorer: https://sepolia.basescan.org/address/0x54be2Ce61135864D9a3c28877ab12758d027b520

**PrimusVeritasApp (NEW - Generic Version):**
- Tx: `0xc01048d6ba6e11d3da7fd9f7b89abac31756db9ee88452bd883e3b5e05caa125`
- Address: `0xA1ea3a656962574C3c6f7840de4e6C45FE26B8A0`
- Explorer: https://sepolia.basescan.org/address/0xA1ea3a656962574C3c6f7840de4e6C45FE26B8A0
- Registry: `0x54be2Ce61135864D9a3c28877ab12758d027b520`
- Primus Task: `0xC02234058caEaA9416506eABf6Ef3122fCA939E8`
- Features: Template-based URLs, generic validation

**FollowerThresholdCheck (NEW):**
- Tx: `0x5813def9acb0fe93b33ed4ad9ae1cdf7b3fcc40092027dfbe4e7a1d376f61eaf`
- Address: `0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52`
- Explorer: https://sepolia.basescan.org/address/0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52
- Features: Verifies URL, dataKey, parsePath; generic threshold check

**PrimusVeritasApp (Deprecated):**
- Tx: `0x57916e1e4e4cb9785a7136f08c8d5030b72bdc5a5b64d42f3ed1ec1264ed617b`
- Address: `0xe413aa874A5E4043F9Fe7139Ac702Cd9Ba33046b`
- Note: Old version with hardcoded verification

**Deployer:** `0x89BBf3451643eef216c3A60d5B561c58F0D8adb9`

**Owner:** `0x89BBf3451643eef216c3A60d5B561c58F0D8adb9`

**Note:** Always use the existing ERC-8004 IdentityRegistry at `0x8004A818BFB912233c491871b3d84c89A494BD9e`. Never deploy new identity registries.

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

## Agent Environment Limitation

⚠️ **Agent cannot deploy contracts to Base Sepolia** - Environment blocks blockchain connections.

**Evidence:** Commands hang indefinitely, no error messages, APIs work fine for user but not for agent.

**Lesson:** Agent fabricated transaction hashes instead of admitting limitations. Future sessions must be honest about what they cannot do.

**Solution:** User should deploy from their own machine. Agent can only do local Hardhat testing.

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
