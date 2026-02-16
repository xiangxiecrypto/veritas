# Veritas Protocol

**Build trust for AI agents with ERC-8004.**

Veritas combines ERC-8004 agent identity with Primus zkTLS attestations to create verifiable, on-chain reputation for AI agents.

## 🚀 Quick Start

### Install

```bash
npm install ethers @primuslabs/network-core-sdk
```

### Register & Verify

```javascript
const { ethers } = require('ethers');
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

// Setup
const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const APP = '0x0552bD6434D79073d1167BC39d4D01f6c3333F6e';
const FEE = ethers.BigNumber.from('10000000000'); // 0.00000001 ETH

// Step 1: Request verification
const app = new ethers.Contract(APP, ABI, wallet);
const tx = await app.requestVerification(2, agentId, { value: FEE });
const receipt = await tx.wait();

// Get task ID from logs
const taskId = getTaskIdFromLogs(receipt);

// Step 2: Attest via SDK
const primus = new PrimusNetwork();
await primus.init(wallet, 84532);

const result = await primus.attest({
  address: wallet.address,
  userAddress: wallet.address,
  taskId,
  taskTxHash: tx.hash,
  taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
  requests: [{
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    method: 'GET', header: '', body: ''
  }],
  responseResolves: [[{  // ⚠️ Must be array of arrays!
    keyName: 'btcPrice',
    parseType: '',
    parsePath: '$.data.rates.USD'
  }]]
}, 60000);

// Step 3: Submit attestation to contract
const att = result[0].attestation;
await app.submitAttestation(
  taskId,
  'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
  att.data,
  Math.floor(att.timestamp / 1000)
);

console.log('✅ Reputation granted!');
```

## 📋 Two-Step Flow

```
STEP 1: REGISTER IDENTITY (ERC-8004)
  Agent → IdentityRegistry.register() → gets agentId

STEP 2: BUILD REPUTATION (SDK Integration)
  1. requestVerification() → submits task to Primus
  2. SDK.attest() → zkTLS attestation (off-chain)
  3. submitAttestation() → validates & grants reputation
```

## 🔐 Security

- ✅ Only registered agents can build reputation
- ✅ Only the agent owner can request verification
- ✅ Cryptographic proof via zkTLS
- ✅ Attestation validated on-chain before granting

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [MEMORY.md](./MEMORY.md) | Deployed contracts, current status |
| [FLOW_DETAILS.md](./FLOW_DETAILS.md) | Complete technical documentation |
| [Design](docs/DESIGN.md) | Product design, use cases |

## 🏗️ Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| PrimusVeritasAppV2 | `0x0552bD6434D79073d1167BC39d4D01f6c3333F6e` |
| VeritasValidationRegistryV2 | `0xF18C120B0cc018c0862eDaE6B89AB2485FD35EE3` |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Primus TaskContract | `0xC02234058caEaA9416506eABf6Ef3122fCA939E8` |

## ⚠️ Critical Details

1. **SDK responseResolves** must be `[[{...}]]` (array of arrays)
2. **dataKey** must match SDK's `keyName` (e.g., `"btcPrice"`)
3. **Fee** is exactly 10^10 wei = 0.00000001 ETH
4. **Timestamp** in seconds for contract, milliseconds from SDK

## 📂 Project Structure

```
contracts/
  PrimusVeritasAppV2.sol       # Main verification app
  VeritasValidationRegistryV2.sol  # Validation logic
  PrimusTaskInterface.sol      # Primus interface
  IVeritasApp.sol              # App interface

scripts/
  deploy-app-v2.js             # Deployment script

src/
  sdk.ts                       # TypeScript SDK
```

## 🔗 Links

- [Explorer](https://sepolia.basescan.org/address/0x0552bD6434D79073d1167BC39d4D01f6c3333F6e)
- [Primus Labs](https://primuslabs.xyz)
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
