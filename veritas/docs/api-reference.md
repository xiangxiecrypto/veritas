# API Reference

Complete API documentation for the Veritas SDK.

## Core Classes

### `VeritasAgent`

Main class for agent operations.

#### Constructor

```typescript
new VeritasAgent(config: AgentConfig)
```

**Parameters:**
- `config.name` (string): Agent display name
- `config.primusAppId` (string): Primus App ID
- `config.primusAppSecret` (string): Primus App Secret
- `config.network` (string): 'base-mainnet' | 'base-sepolia'
- `config.wallet` (string): Private key for transactions

#### Methods

##### `register(metadata: AgentMetadata): Promise<Identity>`

Register a new agent on-chain.

**Parameters:**
- `metadata.name` (string): Agent name
- `metadata.description` (string): Agent description
- `metadata.avatar` (string, optional): Avatar URL
- `metadata.metadata` (object, optional): Custom metadata

**Returns:** `Promise<Identity>`
- `tokenId` (string): ERC-721 token ID
- `address` (string): Agent contract address
- `uri` (string): Metadata URI

##### `attest<T>(fn: () => Promise<T>, options?: AttestOptions): Promise<AttestedResult<T>>`

Execute and attest an API call.

**Parameters:**
- `fn` (function): Async function that makes the API call
- `options.label` (string, optional): Label for this attestation
- `options.tags` (string[], optional): Tags for categorization
- `options.saveToChain` (boolean, optional): Save proof on-chain

**Returns:** `Promise<AttestedResult<T>>`
- `data` (T): Original API response
- `proofHash` (string): On-chain proof reference
- `timestamp` (number): Unix timestamp
- `attestation` (Attestation): Full attestation details

##### `getReputation(): Promise<Reputation>`

Get agent's reputation metrics.

**Returns:** `Promise<Reputation>`
- `verifiedCalls` (number): Total verified API calls
- `successRate` (number): Success rate (0-1)
- `averageRating` (number): Community rating (0-5)
- `totalVolume` (bigint): Total trading volume (if applicable)

---

### `Veritas`

Static utility class for verification.

#### Static Methods

##### `verifyProof(proofHash: string, agentAddress?: string): Promise<boolean>`

Verify a proof's validity.

**Parameters:**
- `proofHash` (string): The proof hash to verify
- `agentAddress` (string, optional): Expected agent address

**Returns:** `Promise<boolean>` — true if valid

##### `getAgent(agentId: string): Promise<AgentProfile>`

Get agent profile and stats.

**Parameters:**
- `agentId` (string): Agent token ID or address

**Returns:** `Promise<AgentProfile>`
- `identity` (Identity): Agent identity
- `stats` (Stats): Performance statistics
- `reputation` (Reputation): Reputation metrics

##### `getProof(proofHash: string): Promise<Attestation>`

Get full attestation details.

**Parameters:**
- `proofHash` (string): Proof hash

**Returns:** `Promise<Attestation>`
- `timestamp` (number)
- `apiEndpoint` (string)
- `requestHash` (string)
- `responseHash` (string)
- `signature` (string)

---

## Types

### `Attestation`

```typescript
interface Attestation {
  timestamp: number;
  apiEndpoint: string;
  requestHash: string;
  responseHash: string;
  agentAddress: string;
  signature: string;
  primusProof: PrimusProof;
}
```

### `Identity`

```typescript
interface Identity {
  tokenId: string;
  address: string;
  uri: string;
  owner: string;
  createdAt: number;
}
```

### `Reputation`

```typescript
interface Reputation {
  verifiedCalls: number;
  successRate: number;
  averageRating: number;
  totalVolume: bigint;
  reviewCount: number;
}
```

---

## Errors

| Code | Description |
|------|-------------|
| `ATTESTATION_FAILED` | zkTLS proof generation failed |
| `CHAIN_REJECTED` | On-chain validation failed |
| `INVALID_PROOF` | Proof verification failed |
| `AGENT_NOT_FOUND` | Agent not registered |
| `RATE_LIMITED` | Too many requests |

---

## Events

### `Agent` Events

```typescript
agent.on('attested', (result: AttestedResult) => {
  console.log('New attestation:', result.proofHash);
});

agent.on('error', (error: VeritasError) => {
  console.error('Attestation error:', error);
});
```
