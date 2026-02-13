# Veritas Protocol - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER APPLICATION                                │
│                         (Agent, dApp, Marketplace)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERITAS SDK (TypeScript)                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Agent Identity  │  │  Attestation     │  │  Verification    │          │
│  │  Management      │  │  Generation      │  │  (read-only)     │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
        ┌───────────────────┐ ┌──────────────┐ ┌───────────────────┐
        │   ERC-8004        │ │   Primus     │ │  Target APIs      │
        │   Contracts       │ │   Network    │ │  (Moltbook, etc)  │
        │   (Base L2)       │ │   SDK        │ │                   │
        └───────────────────┘ └──────────────┘ └───────────────────┘
```

## Component Breakdown

### 1. Veritas SDK (`src/sdk.ts`)

**Purpose**: Developer-facing interface for all protocol operations

**Key Classes**:
```typescript
class VeritasSDK {
  // Configuration
  constructor(config: VeritasConfig)
  
  // Lifecycle
  async initialize(): Promise<void>
  
  // ERC-8004 Identity
  async registerAgent(metadata: AgentMetadata): Promise<number>
  async getAgent(agentId: number): Promise<AgentData>
  async updateAgent(agentId: number, metadata: Partial<AgentMetadata>)
  
  // Attestations (Primus Network)
  async generateAttestation(agentId: number, request: AttestationRequest)
  async verifyAttestation(proofHash: string): Promise<VerificationResult>
  
  // Convenience Methods
  async verifyMoltbookOwnership(agentId: number, moltbookName: string)
}
```

**Design Patterns**:
- **Async/Await**: All blockchain operations return Promises
- **Error Handling**: Custom error types with actionable messages
- **Gas Optimization**: Batched operations where possible

### 2. ERC-8004 Contracts (Base L2)

**Official Contracts** (already deployed):

| Contract | Address (Mainnet) | Purpose |
|----------|-------------------|---------|
| `IdentityRegistry` | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | ERC-721 agent NFTs |
| `ReputationRegistry` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | On-chain feedback |

**Custom Contract** (to be deployed):

| Contract | Purpose |
|----------|---------|
| `VeritasValidationRegistry` | Primus zkTLS attestation storage |

#### VeritasValidationRegistry.sol

```solidity
// Implements IERC8004ValidationRegistry
contract VeritasValidationRegistry {
    // Storage
    mapping(bytes32 => ValidationRequest) public requests;
    mapping(bytes32 => PrimusAttestation) public attestations;
    
    // Core Functions
    function submitPrimusAttestation(
        uint256 agentId,
        bytes32 proofHash,
        string calldata apiEndpoint,
        bytes calldata primusProof,
        string calldata requestURI
    ) external returns (bytes32 requestHash);
    
    function verifyAttestation(bytes32 requestHash) 
        external 
        view 
        returns (bool isValid, uint8 response, bytes memory data);
    
    // ERC-8004 Standard Interface
    function validationRequest(...) external;
    function validationResponse(...) external;
}
```

**Data Structures**:
```solidity
struct PrimusAttestation {
    uint256 agentId;           // ERC-8004 agent ID
    bytes32 proofHash;         // Primus Network proof hash
    string apiEndpoint;        // Verified API endpoint
    uint256 timestamp;         // Block timestamp
    address submitter;         // Wallet that submitted
    bool verified;             // Verification status
}
```

### 3. Primus Network SDK

**Purpose**: Decentralized zkTLS attestation generation

**Architecture**:
```
┌────────────────────────────────────────────────────────────┐
│                    Primus Network                           │
│                                                            │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐ │
│   │  Attester   │────▶│   ZKTLS     │────▶│  Verifier   │ │
│   │    Node     │     │   Proof     │     │    Node     │ │
│   └─────────────┘     └─────────────┘     └─────────────┘ │
│          │                                        │        │
│          └────────────────┬───────────────────────┘        │
│                           │                                │
│                    Decentralized                           │
│                    Consensus                               │
└────────────────────────────────────────────────────────────┘
```

**Integration Flow**:
1. SDK generates attestation request with wallet signature
2. Primus Network nodes execute TLS handshake with target API
3. Zero-knowledge proof generated (proves TLS session without revealing keys)
4. Proof submitted to VeritasValidationRegistry
5. On-chain verification available to anyone

**Key Differences from Enterprise SDK**:
| Feature | Enterprise | Network |
|---------|-----------|---------|
| Auth | App ID + Secret | Wallet signature |
| Decentralization | Single server | Node consensus |
| Trust Model | Trust Primus org | Trust network |
| Setup | Register app | Just need wallet |

### 4. Target APIs

**Moltbook API** (primary target):
```
GET https://www.moltbook.com/api/v1/agents/{name}
Response: { agent: { wallet_address: "0x...", ... } }
```

**Any HTTPS API** (generic support):
- REST APIs with JSON responses
- Configurable extraction paths (JSONPath)
- Support for headers, query params, POST body

## Data Flows

### Flow 1: Agent Registration

```
User ──▶ SDK.registerAgent() ──▶ IdentityRegistry.register()
                                      │
                                      ▼
                              Mint ERC-721 NFT
                              Emit AgentRegistered
                              Return agentId
```

### Flow 2: Generate Attestation

```
User ──▶ SDK.generateAttestation()
              │
              ├──▶ Primus Network SDK.init()
              │         │
              │         └──▶ Connect to decentralized network
              │
              ├──▶ Submit attestation request
              │         │
              │         └──▶ Network nodes query API
              │
              ├──▶ Receive zkTLS proof
              │         │
              │         └──▶ Proof contains:
              │              - Request hash
              │              - Response data
              │              - Timestamps
              │              - Signatures
              │
              └──▶ Submit to ValidationRegistry
                        │
                        └──▶ Store on Base L2
```

### Flow 3: Verify Moltbook Ownership

```
User ──▶ SDK.verifyMoltbookOwnership(agentId, 'CilohPrimus')
              │
              ├──▶ Fetch Moltbook API
              │         GET /api/v1/agents/CilohPrimus
              │         Response: { agent: { wallet_address: "0x123..." } }
              │
              ├──▶ Generate attestation
              │         Attest to: { extractedOwner: "0x123..." }
              │
              ├──▶ Compare wallets
              │         ownerMatch = (extractedOwner === sdk.signer.address)
              │
              └──▶ Return result
                        { attestation, ownerMatch, extractedOwner }
```

## Security Model

### Trust Assumptions

1. **Primus Network**: Honest majority of attester/verifier nodes
2. **Base L2**: Standard Ethereum L2 security (fraud proofs/validity proofs)
3. **Target APIs**: API returns accurate data (Veritas proves the call happened, not data truth)

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Fake attestation | zkTLS proof cryptographically binding |
| Replay attack | Nonce + timestamp in proof |
| API compromise | Veritas proves TLS session, not data correctness |
| Front-running | Commit-reveal for sensitive attestations |
| SDK tampering | Open source + reproducible builds |

### Key Management

- **User Wallet**: Never leaves user's environment
- **SDK**: Signs transactions, never stores keys
- **Contracts**: No admin keys (immutable after deployment)

## Gas Costs (Base L2)

| Operation | Estimated Gas | Cost (at $0.10/gwei) |
|-----------|---------------|---------------------|
| Register Agent | ~150,000 | $0.015 |
| Submit Attestation | ~100,000 | $0.010 |
| Verify Attestation (view) | 0 | Free |
| Update Agent Metadata | ~50,000 | $0.005 |

## Scalability

**Current Limits**:
- Base L2: ~5-10 TPS per contract
- Primus Network: ~1 attestation/minute per agent

**Future Scaling**:
- Batch attestations (roll up multiple proofs)
- Layer 3 on Base for higher throughput
- Off-chain verification with on-chain anchoring
