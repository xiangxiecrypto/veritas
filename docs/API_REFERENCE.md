# API Reference

## VeritasSDK

Main SDK class for interacting with Veritas Protocol.

### Constructor

```typescript
new VeritasSDK(config: VeritasConfig)
```

**VeritasConfig**:
```typescript
interface VeritasConfig {
  provider: ethers.Provider;
  signer: ethers.Signer;
  network?: 'mainnet' | 'sepolia';
  chainId?: number;
}
```

### Methods

#### initialize()
```typescript
async initialize(): Promise<void>
```
Initialize SDK and establish Primus Network connection.

---

#### registerAgent()
```typescript
async registerAgent(metadata: AgentMetadata): Promise<number>
```
Register agent on ERC-8004 Identity Registry.

**AgentMetadata**:
```typescript
interface AgentMetadata {
  name: string;
  description: string;
  services: Service[];
  metadata?: Record<string, any>;
}

interface Service {
  name: string;
  endpoint: string;
  protocol?: string;
}
```

**Returns**: Agent ID (number)

---

#### generateAttestation()
```typescript
async generateAttestation(
  agentId: number,
  request: AttestationRequest
): Promise<AttestationResult>
```

**AttestationRequest**:
```typescript
interface AttestationRequest {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  extracts: Extraction[];
}

interface Extraction {
  key: string;
  path: string;  // JSONPath
}
```

**AttestationResult**:
```typescript
interface AttestationResult {
  requestHash: string;
  taskId: string;
  agentId: number;
  response: Record<string, any>;
  timestamp: number;
}
```

---

#### verifyAttestation()
```typescript
async verifyAttestation(proofHash: string): Promise<VerificationResult>
```

**VerificationResult**:
```typescript
interface VerificationResult {
  isValid: boolean;
  agentId: number;
  response: Record<string, any>;
  timestamp: number;
  submitter: string;
}
```

---

#### verifyMoltbookOwnership()
```typescript
async verifyMoltbookOwnership(
  agentId: number,
  moltbookName: string
): Promise<MoltbookVerificationResult>
```

**MoltbookVerificationResult**:
```typescript
interface MoltbookVerificationResult {
  attestation: AttestationResult;
  ownerMatch: boolean;
  extractedOwner: string;
}
```

---

#### getAgent()
```typescript
async getAgent(agentId: number): Promise<AgentData | null>
```

**AgentData**:
```typescript
interface AgentData {
  id: number;
  owner: string;
  name: string;
  description: string;
  services: Service[];
  metadata: string;  // JSON string
}
```

---

#### updateAgent()
```typescript
async updateAgent(
  agentId: number,
  metadata: Partial<AgentMetadata>
): Promise<void>
```

---

## Contract Addresses

### Base Mainnet
- IdentityRegistry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ReputationRegistry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

### Base Sepolia
- IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
