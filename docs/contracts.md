# Smart Contracts

Complete contract documentation for Veritas Protocol.

## Contract Addresses

### Base Mainnet

| Contract | Address | Status |
|----------|---------|--------|
| IdentityRegistry (ERC-8004) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | ✅ Live |
| ReputationRegistry (ERC-8004) | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | ✅ Live |
| ValidationRegistry | *TBD* | 🚧 Deploying |

### Base Sepolia (Testnet)

| Contract | Address | Status |
|----------|---------|--------|
| IdentityRegistry (ERC-8004) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | ✅ Live |
| ReputationRegistry (ERC-8004) | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | ✅ Live |
| ValidationRegistry | *TBD* | 🚧 Deploying |

---

## ValidationRegistry

Veritas extension contract for storing and verifying zkTLS attestations.

### Overview

The ValidationRegistry stores cryptographic proofs of API calls, enabling:
- On-chain verification of off-chain data
- Immutable audit trails
- Cross-platform trust

### Interface

```solidity
interface IValidationRegistry {
    struct Attestation {
        bytes32 proofHash;
        address agent;
        uint256 timestamp;
        string apiEndpoint;
        bytes32 requestHash;
        bytes32 responseHash;
        bytes primusProof;
    }
    
    function submitAttestation(
        bytes32 _proofHash,
        string calldata _apiEndpoint,
        bytes32 _requestHash,
        bytes32 _responseHash,
        bytes calldata _primusProof
    ) external returns (bool);
    
    function verifyAttestation(
        bytes32 _proofHash
    ) external view returns (bool isValid, uint256 timestamp);
    
    function getAttestation(
        bytes32 _proofHash
    ) external view returns (Attestation memory);
    
    function getAgentAttestations(
        address _agent
    ) external view returns (bytes32[] memory);
}
```

### Key Features

1. **Proof Storage**: Stores zkTLS proofs with metadata
2. **Verification**: On-chain verification of proof validity
3. **Querying**: Get all attestations for an agent
4. **Events**: Emits events for indexers

### Events

```solidity
event AttestationSubmitted(
    bytes32 indexed proofHash,
    address indexed agent,
    uint256 timestamp,
    string apiEndpoint
);

event AttestationVerified(
    bytes32 indexed proofHash,
    bool isValid,
    uint256 verifiedAt
);
```

---

## Usage Examples

### Submit Attestation

```javascript
const tx = await validationRegistry.submitAttestation(
  proofHash,
  "https://api.exchange.com/price/BTC",
  requestHash,
  responseHash,
  primusProof
);
await tx.wait();
```

### Verify On-Chain

```javascript
const [isValid, timestamp] = await validationRegistry.verifyAttestation(proofHash);
console.log(isValid); // true
```

### Get Agent History

```javascript
const proofs = await validationRegistry.getAgentAttestations(agentAddress);
console.log(proofs); // [proofHash1, proofHash2, ...]
```

---

## Security

- All proofs are immutable once submitted
- Only valid Primus proofs are accepted
- Agent identity verified via IdentityRegistry
- Reputation updated via ReputationRegistry

---

## Deployment

See [deployment guide](../examples/deployment.md) for instructions on deploying to Base.
