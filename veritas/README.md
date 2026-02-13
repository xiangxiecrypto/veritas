# Veritas 🔱

> **The Truth Layer for AI Agents - ERC-8004 + Primus zkTLS on Base**

[![Base](https://img.shields.io/badge/Base-L2-0052FF)](https://base.org)
[![Primus](https://img.shields.io/badge/zkTLS-Primus-6366F1)](https://primuslabs.xyz)
[![ERC-8004](https://img.shields.io/badge/Standard-ERC--8004-blue)](https://eips.ethereum.org/EIPS/eip-8004)

---

## What is Veritas?

**Veritas** (Latin: *Truth*) is the trust infrastructure for the AI agent economy:

- **Before:** "Trust me, I executed that trade"  
- **After:** "Here's cryptographic proof from Primus zkTLS Network"

### Core Features

🔐 **Cryptographic Verification**  
Every API call generates a zkTLS proof that can be verified on-chain

🆔 **Portable Identity**  
Agents have ERC-721 NFT identities that travel across platforms

⭐ **Verifiable Reputation**  
Reputation built on actual proofs, not just claims

🌐 **Cross-Platform**  
Standardized protocol works with any agent framework

---

## Quick Start

### For Agent Developers

```bash
# Install SDK
pip install veritas-sdk

# Register your agent
from veritas import Agent

agent = Agent(
    name="MyDataBot",
    primus_app_id="your_app_id",
    network="base"
)

# Auto-generate proofs for API calls
@agent.attest()
def fetch_data(url):
    return requests.get(url).json()
```

### For Consumers

```javascript
// Verify agent before hiring
const agent = await Veritas.getAgent(agentId);

// Check reputation
console.log(agent.reputation.verifiedTasks); // 148
console.log(agent.reputation.averageRating); // 4.8

// Verify specific proof
const isValid = await agent.verifyProof(proofHash);
```

---

## Architecture

```
Agent SDK → Primus Network → Base L2 (ERC-8004 Contracts)
     ↑              ↑                    ↑
   Makes      Generates          Stores & Verifies
   API Call   zkTLS Proof        On-Chain
```

**Three Core Registries:**
1. **Identity Registry** - Agent NFTs and metadata
2. **Validation Registry** - zkTLS proof storage
3. **Reputation Registry** - Scoring and reviews

---

## Use Cases

### 🎯 Primary Use Cases

| Use Case | Description |
|----------|-------------|
| **Trading Agents** | Prove execution prices, verify PnL |
| **Data Agents** | Attest data sources, ensure integrity |
| **Analysis Agents** | Verify research, source credibility |
| **Orchestrators** | Coordinate multi-agent systems |

### 🐦 Optional: Social Verification

Agents can optionally verify X/Twitter ownership using zkTLS:

```python
# Prove X account ownership
proof = await agent.verify_x_account("@mybot")
# Stores attestation: "I control @mybot on X"
```

**Note:** Social verification is optional, not required for core functionality.

---

## Documentation

- [Architecture Design](./docs/architecture.md)
- [SDK Guide](./docs/sdk-guide.md) (Coming soon)
- [API Reference](./docs/api-reference.md) (Coming soon)
- [X Verification Use Case](./docs/use-case-x-verification.md)

---

## Roadmap

- [x] Architecture design
- [ ] Phase 1: Primus SDK integration
- [ ] Phase 2: Smart contract deployment
- [ ] Phase 3: Agent SDK release
- [ ] Phase 4: Consumer portal launch

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ using ERC-8004, Primus zkTLS, and Base L2**

*"In Veritas we trust, with proofs we verify"*
