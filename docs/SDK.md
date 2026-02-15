# SDK Reference

## Installation

```bash
npm install ethers
```

## Initialization

```typescript
import { VeritasSDK } from './src/sdk';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const sdk = new VeritasSDK({
  provider,
  signer,
  network: 'sepolia'  // or 'mainnet'
});

await sdk.initialize();
```

## Contract Access

```typescript
// Access contract instances
sdk.identityRegistry     // ERC-8004 Identity Registry
sdk.reputationRegistry   // ERC-8004 Reputation Registry
sdk.primusVeritasApp     // Veritas App
```

## Methods

### Identity Registration

#### `registerIdentity(name, description)`

Register a new agent with minimal metadata.

```typescript
const agentId = await sdk.registerIdentity("Agent Name", "Description");
// Returns: number
```

#### `registerAgent(agent)`

Register with full metadata.

```typescript
const agentId = await sdk.registerAgent({
  name: "Agent Name",
  description: "Description",
  image: "https://...",        // optional
  services: [                   // optional
    { name: "Service", endpoint: "https://..." }
  ]
});
// Returns: number
```

#### `getAgentOwner(agentId)`

Get the owner address of an agent.

```typescript
const owner = await sdk.getAgentOwner(agentId);
// Returns: string (address)
```

#### `isAgentOwner(agentId, address?)`

Check if address owns the agent.

```typescript
const isOwner = await sdk.isAgentOwner(agentId);
// Returns: boolean

// Or check specific address
const isOwner = await sdk.isAgentOwner(agentId, "0x...");
```

#### `isAgentRegistered(agentId)`

Check if agent exists.

```typescript
const exists = await sdk.isAgentRegistered(agentId);
// Returns: boolean
```

### Verification

#### `requestVerification(agentId, ruleId?)`

Request attestation to build reputation.

```typescript
const taskId = await sdk.requestVerification(agentId, 0);
// Returns: string (bytes32 taskId)

// Throws if:
// - Caller is not agent owner
// - Rule is inactive
// - Wrong fee amount
```

#### `getVerificationRules()`

Get all available verification rules.

```typescript
const rules = await sdk.getVerificationRules();
// Returns: Array<{
//   id: number,
//   url: string,
//   dataKey: string,
//   score: number,
//   maxAge: number,
//   active: boolean,
//   description: string
// }>
```

### Complete Flow

#### `registerAndVerify(name, description, ruleId?)`

Register and verify in one call.

```typescript
const { agentId, taskId } = await sdk.registerAndVerify(
  "Agent Name",
  "Description",
  0  // optional, default: 0
);
// Returns: { agentId: number, taskId: string }
```

### Reputation

#### `getReputationSummary(agentId, clientAddresses, tag1?, tag2?)`

Get aggregated reputation.

```typescript
const summary = await sdk.getReputationSummary(
  agentId,
  ['0xa70063A1970c9c10d0663610Fe7a02495548ba9b']  // Client addresses
);
// Returns: {
//   count: number,
//   averageValue: number,
//   decimals: number
// }
```

## Error Handling

```typescript
try {
  await sdk.requestVerification(agentId, 0);
} catch (error) {
  if (error.message.includes('Not agent owner')) {
    // Handle ownership error
  } else if (error.message.includes('Rule inactive')) {
    // Handle inactive rule
  } else {
    // Handle other errors
  }
}
```

## Network Configuration

### Base Sepolia (Testnet)

```typescript
const sdk = new VeritasSDK({
  provider,
  signer,
  network: 'sepolia'
});
```

Contract Addresses:
| Contract | Address |
|----------|---------|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| PrimusVeritasApp | `0xa70063A1970c9c10d0663610Fe7a02495548ba9b` |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

### Base Mainnet

```typescript
const sdk = new VeritasSDK({
  provider,
  signer,
  network: 'mainnet'
});
```

Contract Addresses: TBD

## Fees

| Network | Fee |
|---------|-----|
| Base Sepolia | 0.00000001 ETH |
| Base Mainnet | TBD |

Fee is paid to Primus for attestation service.
