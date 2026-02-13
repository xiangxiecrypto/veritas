# Veritas Protocol - Product Design

## Vision

Veritas Protocol solves the **identity and trust problem for autonomous AI agents**. In a world where AI agents act on behalf of users, transact value, and interact with each other, how do you know an agent is who it claims to be?

### The Problem

1. **Fake Agents**: Anyone can claim to be "OracleBot" or "TradeMaster"
2. **Unverifiable Claims**: Agents claim to use real data — but how do you verify?
3. **No Reputation**: New agents start from zero trust, even if their owner is reputable
4. **Platform Lock-in**: Agent identity tied to specific platforms (Twitter, Discord)

### The Solution

**Cryptographic proof of identity and real-world attestations**

- **ERC-8004**: Standardized agent identity on Ethereum L2
- **Primus zkTLS**: Cryptographic proof of API calls ("I really queried Binance at 12:00 UTC")
- **Base L2**: Fast, cheap, Ethereum-secured infrastructure

## Target Users

| User | Pain Point | Veritas Solution |
|------|-----------|------------------|
| **AI Agent Developers** | Need credibility for their agents | Register on-chain identity + prove data sources |
| **Prediction Market Bots** | Users don't trust their data | Attest to real API calls with zkTLS proofs |
| **DeFi Agents** | Need to prove reserves/trades | Cryptographic proof of exchange balances |
| **Agent Marketplaces** | Verifying agents is manual | Automated on-chain verification |
| **End Users** | Which agents can I trust? | Check on-chain reputation + attestation history |

## Core Value Propositions

### 1. Proof of Data Provenance
> "This price feed really came from CoinGecko at 12:00 UTC"

Agents generate zkTLS attestations proving they queried specific APIs. Anyone can verify the proof on-chain.

### 2. Portable Identity
> "My agent's reputation follows it across platforms"

ERC-8004 gives agents an NFT-based identity. Reputation accumulates on-chain, not locked to any platform.

### 3. Verifiable Ownership
> "This agent is really owned by @xiang_xie"

Link agent identity to social profiles through cryptographic attestation (not just "trust me bro").

### 4. Composable Trust
> "Build on other agents' reputations"

Smart contracts can check an agent's reputation score before executing high-value operations.

## Use Cases

### Primary: Moltbook Agent Verification
**Scenario**: Agent claims to be "CilohPrimus" on Moltbook

**Without Veritas**:
- Manual verification required
- Platform-dependent trust
- No cryptographic guarantee

**With Veritas**:
```typescript
const { ownerMatch } = await veritas.verifyMoltbookOwnership(agentId, 'CilohPrimus');
// Returns true if Moltbook API confirms wallet ownership
```

**Result**: Cryptographic proof stored on-chain. Anyone can verify.

### Secondary: Oracle Services
**Scenario**: Price oracle claims BTC = $67,000

**Without Veritas**:
- Trust the oracle operator
- No proof of data source
- Centralized risk

**With Veritas**:
```typescript
const attestation = await veritas.generateAttestation(agentId, {
  url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
  method: 'GET',
  extracts: [{ key: 'price', path: '$.price' }]
});
```

**Result**: On-chain proof that Binance was queried at specific time with specific response.

### Tertiary: Agent Reputation
**Scenario**: New agent wants to prove reliability

**Without Veritas**:
- Build reputation from scratch on each platform
- No way to prove historical accuracy

**With Veritas**:
- Register on Identity Registry (ERC-8004)
- Accumulate attestation history
- Reputation Registry tracks feedback

**Result**: Portable reputation score across all platforms.

## Product Principles

1. **Composability First**: Built on standards (ERC-8004) so other projects can integrate
2. **Decentralization**: Network SDK = no single point of failure
3. **Developer Experience**: Simple API, comprehensive examples
4. **Security**: Never handle user private keys
5. **Cost Efficiency**: Base L2 keeps transaction costs low ($0.01-0.10)

## Success Metrics

| Metric | Target |
|--------|--------|
| Registered Agents | 100+ in first 3 months |
| Attestations Generated | 1000+ per month |
| Integrations | 3+ agent frameworks |
| Verification Requests | 100+ per week |

## Differentiation

| Approach | Centralized | Self-Sovereign | **Veritas** |
|----------|-------------|----------------|-------------|
| Identity | Platform username | DID | **ERC-8004 NFT** |
| Attestations | Platform API | Manual claims | **zkTLS proofs** |
| Verification | Platform-dependent | Self-declared | **On-chain verification** |
| Portability | Locked to platform | Limited | **Full portability** |
