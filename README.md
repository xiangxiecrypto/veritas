# Veritas Protocol 🔱

**ERC-8004 Compliant Trust Infrastructure for AI Agents**

Veritas Protocol enables on-chain verification of zkTLS attestations from Primus, creating verifiable reputation for AI agents.

## 🎯 What It Does

- ✅ Validates real-world data attestations on-chain
- ✅ Verifies zkTLS proofs from Primus Network
- ✅ Grants ERC-8004 reputation with **dynamic scoring** (100/98/95)
- ✅ Gas-optimized pure on-chain verification
- ✅ Anti-replay protection
- ✅ Configurable freshness-based scoring

## 📦 Deployed Contracts (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **VeritasValidationRegistry** | [`0x33327EE8e1C100c773632626eB45F14eEcf37fed`](https://sepolia.basescan.org/address/0x33327EE8e1C100c773632626eB45F14eEcf37fed) | Main validator |
| IdentityRegistry | [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://sepolia.basescan.org/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) | ERC-8004 identity |
| ReputationRegistry | [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://sepolia.basescan.org/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) | ERC-8004 reputation |
| Primus TaskContract | [`0xC02234058caEaA9416506eABf6Ef3122fCA939E8`](https://sepolia.basescan.org/address/0xC02234058caEaA9416506eABf6Ef3122fCA939E8) | zkTLS storage |

## 🚀 Quick Start

### 1. Install

```bash
cd veritas-protocol
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your PRIVATE_KEY
```

### 3. Deploy

```bash
npm run deploy:sepolia
```

### 4. Verify

```bash
npm run verify
```

## 🔬 How It Works

```
1. Wallet → Primus: Submit task
2. Primus → zkTLS: Generate attestation
3. Primus → On-chain: Store attestation (taskId)
4. Wallet → Veritas: validateAttestation(taskId, hashes)
5. Veritas → Primus: queryTask(taskId) [on-chain]
6. Veritas: Verify recipient, URL, data, freshness
7. Veritas: Calculate score (100/98/95 based on age)
8. Veritas → Reputation: giveFeedback(score)
```

### Pure On-Chain Verification

The contract fetches attestation data directly from Primus TaskContract:

```solidity
function validateAttestation(
    uint256 agentId,
    bytes32 taskId,
    bytes32 expectedUrlHash,
    bytes32 expectedDataHash
) external returns (bool) {
    // Fetch from Primus (on-chain)
    TaskInfo memory taskInfo = primusTaskContract.queryTask(taskId);

    // Verify
    require(att.recipient == msg.sender);
    require(keccak256(bytes(att.request[0].url)) == expectedUrlHash);
    require(keccak256(bytes(att.data)) == expectedDataHash);
    require(block.timestamp - att.timestamp <= 1 hours);

    // Grant reputation
    reputationRegistry.giveFeedback(agentId, 95, ...);
}
```

## 📊 Example: BTC Price Verification

```javascript
// 1. Generate Primus attestation (off-chain)
const attestation = await primusSdk.createAttestation(
  "https://api.coinbase.com/v2/exchange-rates?currency=BTC"
);

// 2. Submit to Veritas
const tx = await veritas.validateAttestation(
  1, // agentId
  attestation.taskId,
  ethers.utils.id(url),
  ethers.utils.id(responseData)
);

// Result:
// ✅ Recipient: 0x89BBf3451643eef216c3A60d5B561c58F0D8adb9
// ✅ URL: https://api.coinbase.com/v2/exchange-rates?currency=BTC
// ✅ Data: {"btcPrice":"68942.56"}
// 🌟 Reputation: 95/100
// Gas: ~100K (validation only)
```

## 🧪 Test Results

```
✅ AttestationValidated
   Recipient: 0x89BBf3451643eef216c3A60d5B561c58F0D8adb9
   URL: https://api.coinbase.com/v2/exchange-rates?currency=BTC
   Success: true
   🌟 Reputation: 95/100

Gas: 100,000
Cost: 0.000000363845 ETH ($0.00098 @ 2700 ETH/USD)
Tx: https://sepolia.basescan.org/tx/0x8f55e796e1dc3c71b3d35f1afc452679a1a79a946720e8c4b324a1efa68a25cb
```

## 🌟 Dynamic Scoring System

Veritas uses **freshness-based scoring** to incentivize quick verification:

| Attestation Age | Score | Description |
|----------------|-------|-------------|
| < 10 minutes | **100** | Fresh - just created |
| < 30 minutes | **98** | Recent - still warm |
| < 60 minutes | **95** | Normal - valid |
| > 60 minutes | ❌ | Expired - rejected |

### Configuration (Owner Only)

```javascript
// Adjust base score
await veritas.setBaseScore(90, 0);  // Default: 95

// Adjust freshness thresholds
await veritas.setFreshnessThresholds(
  5 * 60,   // 100 if < 5min (default: 10min)
  15 * 60   // 98 if < 15min (default: 30min)
);

// Check score for specific age
const score = await veritas.calculateScore(15 * 60);
console.log(score);  // 98
```

**Benefits:**
- ✅ Rewards quick verification (100 vs 95)
- ✅ Incentivizes fresh attestations
- ✅ Configurable by owner
- ✅ Future-proof design

See [Scoring Guide](./veritas-protocol/docs/SCORING_GUIDE.md) for details.

## 📁 Project Structure

```
veritas-protocol/
├── contracts/
│   └── VeritasValidationRegistry.sol  # Production validator
├── scripts/
│   ├── deploy-veritas.js              # Deploy to Base Sepolia
│   ├── verify-deployment.js           # Verify configuration
│   └── test-veritas.js                # Test attestation validation
├── package.json
├── hardhat.config.js
├── .env.example
└── README.md
```

## 🔐 Security Features

- **Immutable Dependencies**: All external contracts are immutable
- **Anti-Replay**: Each taskId validated once
- **Owner Verification**: Only agent owners can submit
- **Hash Verification**: Prevents data tampering
- **Freshness Check**: 1-hour max age

## 🗺️ Roadmap

- [ ] Deploy to Base Mainnet
- [ ] Build SDK for easy integration
- [ ] Create reputation explorer UI
- [ ] Add multi-proof aggregation
- [ ] Support additional data sources

## 📖 Documentation

- [Veritas Protocol README](./veritas-protocol/README.md) - Full documentation
- [Primus zkTLS](https://primus.zktls.com) - zkTLS infrastructure
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Agent identity standard

## 🤝 Contributing

PRs welcome! See [Primus DevRel Campaign](./primus-devrel-campaign.md) for opportunities.

## 📄 License

MIT

---

Built with ❤️ by the Primus community
