# Veritas Protocol Design

## The Problem

### Trust Crisis in AI Agents

AI agents are increasingly acting autonomously - trading assets, making decisions, and interacting with APIs. But there's a fundamental problem:

**How do you verify what an AI agent actually did?**

Current issues:
- **"Trust me bro" verification** - Agents claim they fetched data, but where's the proof?
- **No on-chain record** - Agent actions disappear into logs
- **Reputation is opaque** - How do you know an agent is trustworthy?
- **No cryptographic proof** - API responses are easily fabricated

### Example Scenario

An AI trading agent claims:
> "I checked Coinbase and BTC is at $95,000, so I bought."

But:
- Did they actually check Coinbase?
- Was the price really $95,000 at that time?
- Can they prove it cryptographically?
- Can you verify this later?

**Without Veritas: No. With Veritas: Yes.**

## The Solution

### Veritas Protocol

Veritas combines two powerful technologies:

1. **ERC-8004 Agent Identity** - On-chain identity for AI agents
2. **Primus zkTLS Attestations** - Cryptographic proof of API calls

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERITAS VALIDATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. AGENT IDENTITY
   ┌──────────┐
   │ Register │ → Agent gets unique on-chain identity (ERC-8004)
   │  Agent   │   Every action is tied to this identity
   └──────────┘

2. VALIDATION REQUEST
   ┌──────────┐     ┌──────────────────────────────┐
   │  Agent   │────▶│ "Fetch https://api.coinbase  │
   │ Requests │     │  and prove BTC price"        │
   └──────────┘     └──────────────────────────────┘
                            │
                            ▼
3. PRIMUS zkTLS ATTESTATION
   ┌──────────────────────────────────────────────────┐
   │  Off-chain zkTLS proof that:                     │
   │  - Coinbase API was called                       │
   │  - Response was: {"rates": {"USD": "95000"}}    │
   │  - Timestamp: 2024-02-24 12:00:00 UTC           │
   └──────────────────────────────────────────────────┘
                            │
                            ▼
4. ON-CHAIN VERIFICATION
   ┌──────────┐     ┌──────────────────────────────┐
   │ Submit   │────▶│ Verify zkTLS proof           │
   │ Proof    │     │ Extract BTC price            │
   └──────────┘     │ Run custom checks            │
                    │ Update agent reputation      │
                    └──────────────────────────────┘
                            │
                            ▼
5. IMMUTABLE RECORD
   ┌──────────────────────────────────────────────────┐
   │  Forever verifiable proof:                       │
   │  - Agent 1234 fetched BTC price                  │
   │  - Price was $95,000                             │
   │  - Proof stored on-chain                         │
   │  - Reputation score: 90/100                      │
   └──────────────────────────────────────────────────┘
```

## What Can Be Proven?

Any API response can be cryptographically attested:

### Public APIs (No Auth)
| API | What You Can Prove |
|-----|-------------------|
| Coinbase | BTC/ETH prices |
| CoinGecko | Market data |
| Weather APIs | Temperature, conditions |
| Sports APIs | Game scores, stats |

### Protected APIs (With Auth)
| API | What You Can Prove |
|-----|-------------------|
| Moltbook | Agent karma, followers |
| Twitter | Follower count, tweets |
| GitHub | Stars, commits |
| Banking | Balance, transactions |

## Custom Validation Rules

### Rule Structure

```javascript
{
  url: "https://api.coinbase.com/v2/exchange-rates?currency=BTC",
  dataKey: "btcPrice",
  parsePath: "$.data.rates.USD",
  maxAge: 3600,  // Proof valid for 1 hour
  checks: [
    { contract: "SimpleVerificationCheck", score: 90 }
  ]
}
```

### Check Logic

Checks validate the attested data:

```solidity
// SimpleVerificationCheck: Verify URL, dataKey, parsePath match
// MoltbookKarmaCheck: Verify karma > 0
// ThresholdCheck: Verify value >= threshold
// PriceRangeCheck: Verify price in range [min, max]
```

## Reputation System

### Score Calculation

```
Total Score = Σ (Check Score × Weight)

Example:
- Rule: BTC Price
- Check 1: SimpleVerificationCheck (score: 90)
- Total: 90/100
- Normalized: 100/100 (passed)
```

### Reputation Storage

```solidity
// ERC-8004 compliant
function giveFeedback(
    uint8 value,      // Score
    bytes32 subject,  // Agent ID
    bytes32 trait,    // "btc_price_validation"
    bytes32 evidence, // Attestation hash
    uint256 date,     // Timestamp
    bytes32 source,   // "veritas"
    uint256 extra     // Rule ID
)
```

## Security Model

### What Is Guaranteed

1. **API Response Authenticity** - zkTLS proves the API actually returned this data
2. **Timestamp Integrity** - Cannot forge when the attestation was made
3. **Immutable Storage** - All proofs stored permanently on-chain
4. **Reputation History** - Full audit trail of all validations

### What Is NOT Guaranteed

1. **API Correctness** - We prove what the API said, not if it's true
2. **API Availability** - API might be down when you check
3. **Real-World Truth** - BTC price on Coinbase might differ from Binance

## Use Cases

### 1. DeFi Protocols
```
Agent: "I checked the price on Coinbase and it's $95,000"
Veritas: ✅ Proven on-chain with cryptographic proof
Protocol: Safe to execute trade
```

### 2. AI Marketplaces
```
Buyer: "Can I trust this agent?"
Veritas: Agent has 500+ validated API calls, 98% success rate
Buyer: Confident purchase
```

### 3. Compliance
```
Auditor: "Did you verify the user's identity?"
Agent: "Yes, verified via KYC API"
Veritas: ✅ Proof stored on-chain
Auditor: Audit complete
```

### 4. Data Providers
```
Consumer: "Is this weather data accurate?"
Provider: "Fetched from NOAA API at 12:00 UTC"
Veritas: ✅ Cryptographic proof available
Consumer: Trust the data
```

## Comparison

| Feature | Without Veritas | With Veritas |
|---------|----------------|--------------|
| API proof | ❌ None | ✅ zkTLS attestation |
| On-chain record | ❌ No | ✅ Permanent |
| Reputation | ❌ Manual | ✅ Automated |
| Auditability | ❌ Logs only | ✅ Full history |
| Trust model | Trust agent | Verify proof |

## Future Roadmap

1. **Multi-API Aggregation** - Prove data from multiple APIs in one attestation
2. **Cross-Chain Verification** - Use proofs on any blockchain
3. **Zero-Knowledge Privacy** - Prove API response without revealing data
4. **Decentralized Attestors** - Remove single point of trust
