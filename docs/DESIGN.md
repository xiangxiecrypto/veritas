# Design

## Product Vision

**Veritas Protocol** enables AI agents to build verifiable, on-chain reputation through cryptographic proofs.

### Problem
- AI agents operate without verifiable credentials
- No way to prove an agent actually performed an action
- Reputation systems rely on trust, not proof

### Solution
- **ERC-8004 Identity**: Each agent has a unique on-chain identity
- **zkTLS Attestation**: Cryptographic proof of HTTPS requests
- **On-chain Reputation**: Immutable record of verified actions

## Core Concepts

### Agent Identity (ERC-8004)
Every agent is represented as an NFT in IdentityRegistry:
- Unique `agentId` (NFT token ID)
- Owner address (the human/entity controlling the agent)
- Metadata (name, description, capabilities)

### Verification Rules
Rules define what constitutes valid proof:
```solidity
struct VerificationRule {
    string url;          // Target URL (e.g., Coinbase API)
    string dataKey;      // JSON key to extract (e.g., "btcPrice")
    int128 score;        // Reputation points for success
    uint256 maxAge;      // Time limit for attestation freshness
}
```

### Attestation
Primus Network provides zkTLS attestations:
1. Attestor makes HTTPS request to target URL
2. Generates zero-knowledge proof of TLS response
3. Signs attestation cryptographically
4. Result stored on-chain in Primus TaskContract

### Reputation
When attestation is validated:
- `ReputationRegistry.giveFeedback(agentId, score)` is called
- Agent's total score increases
- Feedback record stored with proof data

## Use Cases

### 1. Oracle Verification
**Prove an agent can fetch real market data:**
- Rule: Fetch BTC/USD from Coinbase
- Attestation proves agent accessed real API
- Reputation: 100 points

### 2. API Access Verification
**Prove an agent has valid API credentials:**
- Rule: Fetch user data from protected endpoint
- Attestation proves successful authenticated request
- Reputation: Variable based on API sensitivity

### 3. Content Verification
**Prove content existed at a point in time:**
- Rule: Fetch article from news site
- Attestation includes content hash
- Reputation: Based on content type

### 4. Compliance Verification
**Prove regulatory requirements met:**
- Rule: Fetch compliance certificate
- Attestation proves valid certificate
- Reputation: Compliance score

## Security Model

### Threat Model
| Threat | Mitigation |
|--------|------------|
| Fake attestation | zkTLS cryptographic proof |
| Replay attacks | taskId tracked as used |
| Stale data | maxAge freshness check |
| Wrong agent | ERC-8004 ownership verification |
| Wrong URL | keccak256 hash verification |

### Trust Assumptions
1. **Primus Network**: Trusted to generate valid zkTLS proofs
2. **IdentityRegistry**: Trusted for agent ownership
3. **Attestor**: Single attestor (can be expanded)

### Permission Model
- **Agent Owner**: Can request verification for their agents
- **Anyone**: Can call `submitAttestation()` with valid proof
- **Contract Owner**: Can add/update rules

## Economics

### Fee Structure
- User pays Primus fee: 0.00000001 ETH (10^10 wei)
- No protocol fees currently
- Gas costs: ~630,000 gas per verification

### Reputation Scoring
- Scores are signed integers (can be negative)
- Decimals supported for precision
- Scores accumulate over time
- Future: Decay mechanisms possible

## Extensibility

### Custom Rules
New rules can be added for any HTTPS endpoint:
```solidity
app.addRule(
    "https://api.example.com/data",
    "value",     // JSON key
    50,          // score
    2,           // decimals
    3600,        // maxAge (1 hour)
    "Description"
);
```

### Custom Validation
Apps can implement `customCheck()` for additional validation:
```solidity
function customCheck(
    uint256 ruleId,
    string calldata url,
    string calldata data,
    uint64 timestamp
) external override returns (bool) {
    // Custom logic here
    return true;
}
```

### Multiple Attestors
Currently single attestor, can expand:
- Multi-attestor consensus
- Attestor reputation
- Slashing mechanisms

## Future Roadmap

### Phase 1 (Current)
- ✅ Basic verification flow
- ✅ Coinbase price feeds
- ✅ SDK integration

### Phase 2
- [ ] Multiple attestors
- [ ] More data sources
- [ ] Reputation decay

### Phase 3
- [ ] Cross-chain verification
- [ ] Agent discovery
- [ ] Reputation marketplace
