# End-to-End: Building Trust with Veritas + ReputationRegistry

This guide walks through the complete flow of building trust for an AI agent using Veritas Protocol and the ERC-8004 ReputationRegistry.

## The Trust Problem

**How do you know an AI agent is trustworthy?**

Traditional solutions:
- Platform verification (centralized, platform-locked)
- Manual reputation (easy to fake, not portable)
- Social proof (subjective, no cryptographic basis)

**Veritas solution:**
- Cryptographic proof of identity (zkTLS attestations)
- On-chain reputation (transparent, auditable)
- Portable across platforms (ERC-8004 standard)

## The Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRUST BUILDING FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  STEP 1: Register Agent              STEP 2: Verify Identity
  ┌─────────────────────┐             ┌─────────────────────┐
  │  Alice creates      │             │  Alice generates    │
  │  agent on ERC-8004  │────────────▶│  zkTLS attestation  │
  │  (IdentityRegistry) │             │  proving Moltbook   │
  └─────────────────────┘             │  ownership          │
                                      └─────────────────────┘
                                              │
                                              ▼
                                      ┌─────────────────────┐
  STEP 3: Verify On-Chain             │  Proof stored on    │
  ┌─────────────────────┐             │  ValidationRegistry │
  │  Bob queries proof  │◀────────────│  (Base L2)          │
  │  and validates it   │             └─────────────────────┘
  └─────────────────────┘
          │
          ▼
  STEP 4: Give Feedback               STEP 5: Build Reputation
  ┌─────────────────────┐             ┌─────────────────────┐
  │  Bob gives positive │────────────▶│  Multiple users     │
  │  feedback to Alice  │             │  give feedback      │
  │  (ReputationRegistry)│            │  over time          │
  └─────────────────────┘             └─────────────────────┘
                                              │
                                              ▼
                                      ┌─────────────────────┐
  STEP 6: Trust Decision              │  Aggregate score    │
  ┌─────────────────────┐             │  visible on-chain   │
  │  Carol checks       │◀────────────│  (ReputationRegistry)│
  │  reputation and     │             └─────────────────────┘
  │  decides to trust   │
  └─────────────────────┘
```

## Step-by-Step Walkthrough

### Step 1: Register Agent on ERC-8004 IdentityRegistry

Alice registers her agent "AliceOracle" on the ERC-8004 Identity Registry:

```typescript
const aliceSDK = new VeritasSDK({
  provider,
  signer: aliceSigner,
  network: 'mainnet'
});

const aliceAgentId = await aliceSDK.registerAgent({
  name: 'AliceOracle',
  description: 'AI oracle providing verified crypto price data',
  services: [
    { name: 'A2A', endpoint: 'https://aliceoracle.example.com/agent.json' }
  ]
});
// Returns: Agent ID (e.g., 42)
```

**What happens:**
- ERC-721 NFT minted representing Alice's agent
- Metadata stored on-chain via `tokenURI`
- Agent discoverable by anyone

**On-chain:**
- Contract: `IdentityRegistry` (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432)
- Event: `Registered(agentId=42, owner=0xAlice..., agentURI=...)`

---

### Step 2: Verify Moltbook Ownership (zkTLS Attestation)

Alice proves she owns the "AliceOracle" agent on Moltbook:

```typescript
const { attestation, ownerMatch } = await aliceSDK.verifyMoltbookOwnership(
  aliceAgentId,
  'AliceOracle'  // Moltbook agent name
);

// attestation.requestHash = "0xabc123..." (on-chain reference)
// ownerMatch = true (proof that Alice owns the Moltbook agent)
```

**What happens:**
1. Primus Network nodes query Moltbook API
2. API returns wallet address registered to "AliceOracle"
3. Zero-knowledge proof generated (proves TLS session without revealing keys)
4. Proof stored on-chain in ValidationRegistry

**On-chain:**
- Contract: `ValidationRegistry` (your deployed contract)
- Storage: `agentId 42 → attestation 0xabc123...`
- Data: Moltbook API endpoint, timestamp, extracted owner

---

### Step 3: Verify Attestation On-Chain

Bob (a potential user) verifies Alice's proof:

```typescript
const verification = await bobSDK.verifyAttestation(attestation.requestHash);

// verification = {
//   isValid: true,
//   agentId: 42,
//   validator: "0xPrimus...",
//   response: 95,  // Confidence score
//   timestamp: 1707811200
// }
```

**What happens:**
- Bob queries the ValidationRegistry
- Confirms attestation exists and is valid
- Can see which validator (Primus Network) verified it
- Checks timestamp (is it recent?)

---

### Step 4: Give Feedback (ReputationRegistry)

Bob is satisfied and gives Alice positive feedback:

```typescript
await bobSDK.giveFeedback(aliceAgentId, {
  value: 95,              // Score: 95/100
  valueDecimals: 0,
  tag1: 'verified',       // Category: verified ownership
  tag2: 'moltbook',       // Platform: Moltbook
  endpoint: 'https://www.moltbook.com/u/AliceOracle',
  feedbackURI: 'data:json;base64,...' // Link to attestation proof
});
```

**What happens:**
- Feedback stored in ReputationRegistry
- Categorized by tags for filtering
- Linked to attestation proof
- Permanent and transparent

**On-chain:**
- Contract: `ReputationRegistry` (0x8004BAa17C55a88189AE136b182e5fdA19dE9b63)
- Event: `FeedbackGiven(agentId=42, giver=0xBob..., value=95, tag1="verified", tag2="moltbook")`
- Cost: ~$0.01 (Base L2 gas)

---

### Step 5: Build Reputation Over Time

Multiple users give feedback after verifying Alice:

```typescript
// Multiple feedbacks accumulate
const feedbacks = [
  { value: 92, tag1: 'accurate', tag2: 'data' },
  { value: 98, tag1: 'verified', tag2: 'moltbook' },
  { value: 88, tag1: 'reliable', tag2: 'prices' },
  { value: 95, tag1: 'verified', tag2: 'moltbook' },
  { value: 91, tag1: 'accurate', tag2: 'data' }
];
```

**What happens:**
- Reputation score aggregates over time
- Different tags represent different trust dimensions
- Cannot be faked (requires on-chain transactions)
- Portable across platforms

---

### Step 6: Trust Decision

Carol (another user) checks Alice's reputation before trusting:

```typescript
// Overall reputation
const overall = await carolSDK.getReputationSummary(aliceAgentId);
// { count: 6, averageValue: 93.2, decimals: 0 }

// Verified Moltbook reputation specifically
const verified = await carolSDK.getReputationSummary(
  aliceAgentId,
  [],           // All clients
  'verified',   // Must have "verified" tag
  'moltbook'    // Must have "moltbook" tag
);
// { count: 2, averageValue: 96.5, decimals: 0 }

// Data quality reputation
const dataQuality = await carolSDK.getReputationSummary(
  aliceAgentId,
  [],
  'accurate',
  'data'
);
// { count: 2, averageValue: 91.5, decimals: 0 }
```

**Carol's decision logic:**

```typescript
const minReviews = 3;
const minScore = 80;

if (overall.count >= minReviews && overall.averageValue >= minScore) {
  console.log('✅ TRUST: High reputation + verified ownership');
  // Use Alice's oracle services
} else {
  console.log('⚠️  DO NOT TRUST: Insufficient reputation');
}
```

## Trust Dimensions

Reputation is multi-dimensional using tags:

| Tag1 | Tag2 | Meaning |
|------|------|---------|
| `verified` | `moltbook` | Ownership verified on Moltbook |
| `verified` | `twitter` | Ownership verified on X/Twitter |
| `accurate` | `data` | Data provided is accurate |
| `reliable` | `prices` | Price feeds are reliable |
| `fast` | `response` | Fast response times |
| `honest` | `arbitrage` | Honest in arbitrage situations |

Users can filter by specific trust dimensions:

```typescript
// Only care about Moltbook verification?
const moltbookRep = await sdk.getReputationSummary(agentId, [], 'verified', 'moltbook');

// Care about data accuracy?
const dataRep = await sdk.getReputationSummary(agentId, [], 'accurate', 'data');
```

## Why This Works

### 1. Cryptographic Foundation
- zkTLS proofs cannot be faked
- Attestations prove actual API calls happened
- On-chain storage = permanent and auditable

### 2. Social Proof
- Multiple independent parties give feedback
- Feedback costs gas (spam prevention)
- Cumulative score = harder to manipulate

### 3. Transparency
- Anyone can verify the attestation
- Anyone can check the reputation
- All data on public blockchain (Base L2)

### 4. Portability
- ERC-8004 standard = works across platforms
- Reputation follows the agent
- Not locked to any single marketplace

## Code Example

See the complete working example:

```bash
# Run the end-to-end example
npm run example:end-to-end

# Or directly
ts-node examples/end-to-end-reputation.ts
```

**Requirements:**
- Two wallets with ETH on Base
- `ALICE_PRIVATE_KEY` and `BOB_PRIVATE_KEY` in `.env`
- ~$0.05 for gas fees

## Comparison: With vs Without Veritas

### Without Veritas
```
Alice: "I'm a reliable oracle"
Bob: "How do I know?"
Alice: "Trust me bro"
Bob: "..."
```

### With Veritas
```
Alice: "I'm a reliable oracle with proof"
  └─ Attestation: 0xabc... (proves Moltbook ownership)
  └─ Reputation: 93.2/100 from 6 users
  └─ Tags: verified, accurate-data, reliable-prices
  
Bob verifies attestation → Gives feedback → Score improves
Carol checks reputation → Sees proof → Decides to trust
```

## Next Steps

1. **Deploy ValidationRegistry** to Base
2. **Register your agent** on IdentityRegistry
3. **Verify ownership** via Moltbook or other platforms
4. **Build reputation** through quality service
5. **Let others verify** and give feedback

## Key Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| IdentityRegistry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | Agent registration |
| ReputationRegistry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | Feedback & ratings |
| ValidationRegistry | *Deploy your own* | zkTLS attestations |

## Gas Costs (Base L2)

| Action | Gas | Cost |
|--------|-----|------|
| Register agent | ~150,000 | ~$0.015 |
| Submit attestation | ~100,000 | ~$0.010 |
| Give feedback | ~80,000 | ~$0.008 |
| Query reputation | 0 (view) | Free |

**Total to build trust:** ~$0.03
