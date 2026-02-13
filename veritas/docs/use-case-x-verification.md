# Optional Use Case: X/Twitter Identity Verification

> **Note:** This is an optional extension to Veritas Protocol. Agents do NOT need X verification to use the core protocol.

---

## Overview

Agents can optionally prove ownership of X (Twitter) accounts using zkTLS attestation. This links on-chain identity to social reputation.

## Why Verify X Identity?

- **Social Proof:** Link established social presence to agent identity
- **Reputation Portability:** Bring X followers/reputation on-chain
- **Trust Signal:** Consumers recognize familiar accounts
- **Marketing:** Easier discovery through social channels

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent     │────▶│  Makes      │────▶│  Primus     │
│   Requests  │     │  Auth'd API │     │  Generates  │
│   X Verify  │     │  Call to X  │     │  Proof      │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                    ┌───────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Validation Registry stores:                             │
│  • "Agent #1234 controls @username"                      │
│  • Proof hash: 0xabc...                                  │
│  • X API endpoint verified                               │
│  • Timestamp: 2026-02-12T15:30:00Z                      │
└─────────────────────────────────────────────────────────┘
```

## Technical Flow

### Step 1: Agent Requests X Verification

```python
from trustagent import Agent

agent = Agent(agent_id=1234)

# Initiate X verification
verification = await agent.request_x_verification(
    x_handle="@MyBotAccount"
)
```

### Step 2: X API Call with zkTLS

```python
# Agent makes authenticated request to X API
# Primus captures the TLS handshake

attestation = await primus.generate_attestation(
    url="https://api.twitter.com/2/users/me",
    method="GET",
    headers={"Authorization": "Bearer {X_AUTH_TOKEN}"},
    response_fields=[
        {"field": "$.data.username", "type": "string"},
        {"field": "$.data.id", "type": "string"}
    ]
)
```

### Step 3: Submit to Validation Registry

```solidity
// On Base L2
validationRegistry.submitXVerification(
    agentId: 1234,
    xHandle: "@MyBotAccount",
    xUserId: "1234567890",
    primusAttestationId: "att_xyz123",
    proof: "0x..."
);
```

### Step 4: Consumer Verification

```javascript
// Anyone can verify
const xVerify = await agent.getXVerification();

console.log(xVerify);
// {
//   handle: "@MyBotAccount",
//   verified: true,
//   attestationId: "att_xyz123",
//   proofHash: "0xabc..."
// }

// Verify on-chain
const isValid = await validationRegistry.verifyXProof(xVerify.proofHash);
```

## Privacy Considerations

- **Selective Disclosure:** Agent can choose what X data to reveal
- **Proof Only:** Only attestation hash stored on-chain, not X API keys
- **Revocable:** Agent can revoke X verification anytime

## Implementation

### Smart Contract Extension

```solidity
contract XVerificationRegistry {
    struct XVerification {
        string xHandle;
        string xUserId;
        bytes32 attestationId;
        uint256 verifiedAt;
        bool isActive;
    }
    
    mapping(uint256 => XVerification) public xVerifications;
    
    event XVerified(
        uint256 indexed agentId,
        string xHandle,
        bytes32 attestationId
    );
    
    function verifyXAccount(
        uint256 agentId,
        string calldata xHandle,
        string calldata xUserId,
        bytes32 attestationId,
        bytes calldata primusProof
    ) external {
        // Verify through Primus
        require(
            primusZKTLS.verifyAttestation(attestationId, primusProof),
            "Invalid X attestation"
        );
        
        xVerifications[agentId] = XVerification({
            xHandle: xHandle,
            xUserId: xUserId,
            attestationId: attestationId,
            verifiedAt: block.timestamp,
            isActive: true
        });
        
        emit XVerified(agentId, xHandle, attestationId);
    }
}
```

## UI Example

```
🤖 Agent Profile: DataBot #1234
─────────────────────────────────
✅ Identity Verified (ERC-8004)
✅ X Account: @DataBotOfficial
   └─ Proof: 0xabc... (verified)
⭐ Reputation: 4.8/5 (148 tasks)
📊 Category: Data Analysis
```

## Alternative Social Verifications

Same pattern works for:
- GitHub account verification
- Discord server ownership
- LinkedIn profile
- Any API that supports OAuth

## When NOT to Use

- If agent has no social presence
- If agent operates anonymously
- If X API access is unavailable
- Core protocol works perfectly without it!

---

**Remember:** X verification is completely optional. It's just one way agents can build additional trust signals. 🐦
