# Product Design

## What is Veritas?

Veritas is a trust infrastructure for AI agents. It provides **on-chain identity** and **verifiable reputation** using ERC-8004 and Primus zkTLS attestations.

## Why Veritas?

AI agents are becoming autonomous actors in digital systems. They make decisions, execute transactions, and interact with users. But how do you **trust** an AI agent?

Traditional approaches:
- Centralized reputation systems (opaque, manipulable)
- Manual verification (slow, unscalable)
- No on-chain proof (not composable)

Veritas solves this by:
1. **Permanent Identity**: ERC-8004 registration creates immutable agent identity
2. **Verifiable Proof**: Primus zkTLS provides cryptographic attestation
3. **On-chain Reputation**: Transparent, composable reputation scores

## Core Concepts

### Agent Identity (ERC-8004)

Every agent gets a unique `agentId` through ERC-8004 registration:

```
Agent Owner → IdentityRegistry.register(metadata) → agentId
```

The agent becomes an NFT with:
- Permanent on-chain identity
- Owner-controlled metadata
- Transferable ownership

### Reputation Building

Agents build reputation through **attestations** - cryptographic proofs of real-world actions:

```
Agent Owner → requestVerification(agentId, ruleId) → Primus attests → Reputation granted
```

Current verification rules:
- **BTC Price Fetch**: Proves agent can fetch live BTC/USD price
- **ETH Price Fetch**: Proves agent can fetch live ETH/USD price

Future rules can verify:
- API access capabilities
- Social media presence
- Account ownership
- Any web-accessible data

## Use Cases

### 1. Autonomous Trading Agents
Prove the agent can reliably fetch market data and execute trades.

### 2. AI Oracles
Verify an AI agent's ability to fetch and validate external data.

### 3. Agent Marketplaces
Trust score helps users choose reliable agents for tasks.

### 4. DeFi Protocols
Agents with high reputation can participate in governance or execute privileged actions.

## Security Model

```
┌─────────────────────────────────────────────────────────┐
│  REQUIREMENT 1: Agent must be registered                │
│  → identityRegistry.ownerOf(agentId) succeeds           │
├─────────────────────────────────────────────────────────┤
│  REQUIREMENT 2: Caller must be the agent owner          │
│  → msg.sender == ownerOf(agentId)                       │
├─────────────────────────────────────────────────────────┤
│  REQUIREMENT 3: Attestation must be valid               │
│  → Primus zkTLS verification                            │
│  → URL matches rule                                     │
│  → Data key exists                                      │
│  → Timestamp is fresh                                   │
└─────────────────────────────────────────────────────────┘
```

## Design Principles

1. **Simplicity**: Two-step flow (Register → Verify)
2. **Security**: Only agent owner can build reputation
3. **Transparency**: All reputation on-chain
4. **Composability**: ERC-8004 compatible with existing tools
5. **Extensibility**: New verification rules can be added
