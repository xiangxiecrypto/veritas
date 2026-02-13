# Veritas 🔱
## The Truth Layer for AI Agents - ERC-8004 + Primus zkTLS on Base

> *"In Veritas we trust, with proofs we verify"*

**Version:** 0.1.0  
**Status:** Design Phase  
**Network:** Base L2  
**zkTLS Provider:** Primus Network

---

## 1. Vision

Veritas Protocol enables AI agents to prove their actions, build verifiable reputation, and collaborate across organizational boundaries without pre-existing trust.

### Core Value Proposition
- **For Agent Developers:** Build trustworthy agents with cryptographic proofs
- **For Consumers:** Hire verified agents with transparent history
- **For Ecosystem:** Standardized trust layer for the agent economy

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Agent SDK   │  │  Consumer    │  │  Attestation         │  │
│  │  (Python/JS) │  │  Portal      │  │  Explorer            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│              PRIMUS ZKTLS NETWORK LAYER                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Prover    │◄──►│ Attestation │◄──►│  Verifier   │         │
│  │   Node      │    │   Network   │    │   Node      │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│              ERC-8004 SMART CONTRACTS (BASE L2)                  │
│  ┌────────────────┬────────────────┬────────────────────────┐  │
│  │   IDENTITY     │   REPUTATION   │     VALIDATION         │  │
│  │   REGISTRY     │   REGISTRY     │     REGISTRY           │  │
│  └────────────────┴────────────────┴────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Identity Registry (ERC-721)
- Agent registration with unique NFT
- Primus App ID linkage
- Capability declarations
- Owner verification

### 3.2 Reputation Registry
- Task completion tracking
- Consumer ratings and reviews
- Verified vs unverified task ratio
- Consistency scoring

### 3.3 Validation Registry
- Primus zkTLS proof storage
- On-chain verification hooks
- Challenge/slashing mechanism
- Privacy-preserving attestations

---

## 4. Key Workflows

### 4.1 Agent Registration
1. Developer creates Primus App
2. Deploys agent with Veritas SDK
3. Registers on Identity Registry (Base)
4. Receives Agent NFT

### 4.2 Attested Execution
1. Agent makes API call
2. Primus Network generates zkTLS proof
3. Proof submitted to Validation Registry
4. Reputation updated automatically

### 4.3 Cross-Agent Collaboration
1. Agent A discovers Agent B via Registry
2. Verifies B's reputation and proofs
3. Collaborates with attested interactions
4. Mutual reputation updates

---

## 5. Use Cases

### 5.1 Primary Use Cases
- **Trading Agents:** Prove execution prices, verify PnL claims
- **Data Agents:** Attest data sources, ensure data integrity
- **Analysis Agents:** Verify research methodology, source credibility
- **Orchestration Agents:** Coordinate multi-agent systems with trust

### 5.2 Optional Use Case: Social Identity Verification
**X/Twitter Ownership Verification**
- Agents can prove ownership of X accounts
- Uses zkTLS to verify X API responses
- Links on-chain identity to social reputation
- **Note:** Optional feature, not required for core protocol

Example flow:
```
Agent wants to prove X ownership
    ↓
Makes authenticated request to X API
    ↓
Primus generates attestation: "I control @username"
    ↓
Stored in Validation Registry
    ↓
Consumers can verify: "This agent = @username on X"
```

---

## 6. Technical Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base L2 |
| zkTLS | Primus Network |
| Identity | ERC-8004 (ERC-721) |
| Smart Contracts | Solidity 0.8.19 |
| Backend SDK | Python, Node.js |
| Frontend | React, Web3.js |

---

## 7. Implementation Roadmap

### Phase 1: Primus Integration (Weeks 1-2)
- [ ] Set up Primus SDK
- [ ] Create Primus App
- [ ] Implement attestation generation
- [ ] Test on Base Sepolia

### Phase 2: Smart Contracts (Weeks 3-4)
- [ ] Deploy Identity Registry
- [ ] Deploy Validation Registry
- [ ] Deploy Reputation Registry
- [ ] Contract verification

### Phase 3: Agent SDK (Weeks 5-6)
- [ ] Python SDK
- [ ] JavaScript SDK
- [ ] Auto-attestation middleware
- [ ] Documentation

### Phase 4: Consumer Interface (Weeks 7-8)
- [ ] Agent discovery portal
- [ ] Attestation explorer
- [ ] Reputation dashboard
- [ ] Verification UI

---

## 8. Repository Structure

```
trustagent-protocol/
├── docs/                   # Documentation
│   ├── architecture.md     # This file
│   ├── sdk-guide.md        # Developer guide
│   └── api-reference.md    # API docs
├── contracts/              # Smart contracts
│   ├── IdentityRegistry.sol
│   ├── ValidationRegistry.sol
│   └── ReputationRegistry.sol
├── sdk/                    # SDK implementations
│   ├── python/
│   └── javascript/
└── examples/               # Example implementations
    ├── trading-agent/
    ├── data-agent/
    └── twitter-verification/  # Optional
```

---

## 9. Success Metrics

- **Adoption:** Number of registered agents
- **Verification:** % of tasks with zkTLS proofs
- **Trust:** Average reputation scores
- **Engagement:** Cross-agent collaborations

---

## 10. Future Extensions

- Multi-chain support (Ethereum, Arbitrum, Optimism)
- Integration with agent frameworks (LangChain, AutoGPT)
- Decentralized agent marketplace
- DAO governance for protocol parameters

---

**Next Steps:** Begin Phase 1 - Primus SDK Integration
