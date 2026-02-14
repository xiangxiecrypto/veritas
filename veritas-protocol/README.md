# Veritas Protocol

**ERC-8004 Compliant Trust Infrastructure for AI Agents**

Veritas Protocol enables on-chain verification of zkTLS attestations from Primus, creating verifiable reputation for AI agents.

## 🎯 Overview

Veritas validates real-world data attestations on-chain:
- Fetches Primus attestations directly from the TaskContract
- Verifies recipient ownership, data integrity, and freshness
- Grants ERC-8004 reputation scores (95/100 for valid attestations)
- Gas-optimized: only sends metadata (taskId + hashes), contract fetches data

## 📦 Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **VeritasValidationRegistry** | [`0x33327EE8e1C100c773632626eB45F14eEcf37fed`](https://sepolia.basescan.org/address/0x33327EE8e1C100c773632626eB45F14eEcf37fed) | Main attestation validator |
| IdentityRegistry | [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://sepolia.basescan.org/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) | ERC-8004 identity |
| ReputationRegistry | [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://sepolia.basescan.org/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) | ERC-8004 reputation |
| Primus TaskContract | [`0xC02234058caEaA9416506eABf6Ef3122fCA939E8`](https://sepolia.basescan.org/address/0xC02234058caEaA9416506eABf6Ef3122fCA939E8) | zkTLS attestation storage |

## 🔧 How It Works

```
┌─────────────┐      1. submitTask()      ┌──────────────┐
│   Wallet    │ ──────────────────────────▶│    Primus    │
│             │                            │  TaskContract│
│             │◀─────── taskId ────────────│              │
│             │      2. zkTLS attestation  └──────────────┘
│             │         stored on-chain
│             │
│             │      3. validateAttestation(taskId, hashes)
│             │ ──────────────────────────────────────────▶
│             │                                ┌────────────────────┐
│             │                                │  VeritasRegistry   │
│             │                                │                    │
│             │                                │ 4. queryTask(taskId)
│             │                                │ ─────────────────▶ │
│             │                                │                    │
│             │                                │◀── Attestation ────│
│             │                                │   (on-chain data)  │
│             │                                │                    │
│             │                                │ 5. Verify:         │
│             │                                │  • recipient match │
│             │                                │  • URL hash        │
│             │                                │  • data hash       │
│             │                                │  • freshness       │
│             │                                │                    │
│             │◀─────── ✅ Reputation 95/100 ──│ 6. giveFeedback() │
└─────────────┘                                └────────────────────┘
```

### Verification Steps

1. **Recipient Match**: `attestation.recipient == msg.sender`
2. **URL Hash**: `keccak256(attestation.url) == expectedUrlHash`
3. **Data Hash**: `keccak256(attestation.data) == expectedDataHash`
4. **Freshness**: `block.timestamp - attestation.timestamp <= 1 hour`
5. **Replay Protection**: Each `taskId` can only be used once

## 🚀 Quick Start

### Deploy

```bash
npx hardhat run scripts/deploy-veritas.js --network base-sepolia
```

### Validate Attestation

```javascript
const veritas = new ethers.Contract(VERITAS_ADDRESS, ABI, wallet);

// Generate Primus attestation (off-chain)
const attestation = await primusSdk.createAttestation(url, responseBody);

// Submit to Veritas
const tx = await veritas.validateAttestation(
  agentId,           // Your ERC-8004 agent ID
  attestation.taskId,
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(url)),
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(responseData))
);

await tx.wait();
// Reputation: 95/100 ✅
```

## 📊 Example: BTC Price Attestation

```javascript
// 1. Fetch BTC price with zkTLS proof
const url = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
const attestation = await primusSdk.createAttestation(url);

// 2. Submit to Veritas
const tx = await veritas.validateAttestation(
  1, // agentId
  attestation.taskId,
  ethers.utils.id(url),
  ethers.utils.id(JSON.stringify({btcPrice: "68942.56"}))
);

// Result:
// ✅ Recipient Match
// ✅ URL Valid
// ✅ Data Valid
// ✅ Fresh (timestamp: now)
// 🌟 Reputation: 95/100
// Gas: ~100K (validation only)
```

## 🔬 Architecture

### Pure On-Chain Verification

```solidity
function validateAttestation(
    uint256 agentId,
    bytes32 taskId,
    bytes32 expectedUrlHash,
    bytes32 expectedDataHash
) external onlyAgentOwner(agentId) returns (bool) {
    // 1. Fetch from Primus (on-chain)
    TaskInfo memory taskInfo = primusTaskContract.queryTask(taskId);

    // 2. Extract attestation
    Attestation memory att = taskInfo.taskResults[0].attestation;

    // 3. Verify recipient
    require(att.recipient == msg.sender, "Recipient mismatch");

    // 4. Verify hashes
    require(keccak256(bytes(att.request[0].url)) == expectedUrlHash);
    require(keccak256(bytes(att.data)) == expectedDataHash);

    // 5. Verify freshness
    require(block.timestamp - att.timestamp <= MAX_AGE);

    // 6. Grant reputation
    reputationRegistry.giveFeedback(agentId, 95, 0, ...);

    return true;
}
```

### Why Pure On-Chain?

- **Trustless**: No off-chain infrastructure to compromise
- **Verifiable**: Anyone can replay verification on-chain
- **Composable**: Other contracts can integrate directly
- **Gas-Efficient**: Wallet only sends 32-byte hashes, contract fetches data

## 🧪 Test Results

```bash
✅ AttestationValidated
   Recipient: 0x89BBf3451643eef216c3A60d5B561c58F0D8adb9
   URL: https://api.coinbase.com/v2/exchange-rates?currency=BTC
   Success: true
   🌟 Reputation: 95/100

Gas Used: ~100K
Cost: 0.000000363845 ETH ($0.00098 @ 2700 ETH/USD)
Tx: https://sepolia.basescan.org/tx/0x8f55e796e1dc3c71b3d35f1afc452679a1a79a946720e8c4b324a1efa68a25cb
```

## 📝 Contract Structure

```
contracts/
└── VeritasValidationRegistry.sol    # Production validator

scripts/
└── deploy-veritas.js                # Deployment script
```

## 🔐 Security

- **Immutable Dependencies**: All external contracts are immutable references
- **Anti-Replay**: Each taskId can only be validated once
- **Owner Verification**: Only agent owners can submit attestations
- **Hash Verification**: Prevents data tampering
- **Freshness Check**: Prevents replay of old attestations

## 🗺️ Roadmap

- [ ] Deploy to Base Mainnet
- [ ] Add support for multiple Primus attestors
- [ ] Create SDK for easy integration
- [ ] Build reputation explorer UI
- [ ] Add attestation aggregation (multi-proof)

## 📄 License

MIT

## 🔗 Links

- **Primus zkTLS**: https://primus.zktls.com
- **ERC-8004**: https://eips.ethereum.org/EIPS/eip-8004
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **Gateway**: https://gateway.primus.zktls.com

---

Built with ❤️ by the Primus community
