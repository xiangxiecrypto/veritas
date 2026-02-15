# Veritas V2 - Deployment Summary

## ✅ Completed

### 1. Smart Contract (V2)
**Address**: `0xC5eB0Fbc0537369af5dcCD78D799AfD3C6F5D4EE`
**Network**: Base Sepolia
**Transaction**: https://sepolia.basescan.org/tx/0xc304b019f605640ff2bfdb806bb7b2a732fadd1e6b8cb3a717cbafeb13b77564

**Features**:
- 3 on-chain verification checks (Checks 2, 3, 4)
- Checks 1 & 5 already verified by Primus
- Auto-reputation on successful verification
- Replay protection via proof hash tracking

### 2. SDK Updated
- New method: `generateAndSubmitAttestation()` - generates + verifies + submits
- New method: `verifyAttestationOnChain()` - direct contract verification
- Backward compatibility maintained
- V2 contract address configured

### 3. Three On-Chain Checks

| Check | Name | Verification |
|-------|------|--------------|
| Check 2 | API Source | Is API in whitelist? |
| Check 3 | Data Keys | Does data have required keys? |
| Check 4 | Timestamp | Is timestamp fresh (< 1 hour)? |

**Checks 1 & 5** (Attestor + Signature) verified by Primus when storing on-chain.

### 4. Contract Configuration

**Allowed APIs**:
- `https://api.coinbase.com/v2/exchange-rates`
- `https://api.binance.com/api/v3/ticker/price`

**Required Data Keys**:
- `btcPrice`

### 5. Reputation Flow

```
User → submitAttestation() → Contract
                                  ↓
                        Run 3 checks on-chain
                                  ↓
                        All pass? → Give reputation
                                  ↓
                        Store attestation
```

**Reputation given by**: Contract (ValidationRegistryV2)
**Reputation score**: Based on 3-check results (95/100 for all passing)

## 🔗 Key Links

- **V2 Contract**: https://sepolia.basescan.org/address/0xC5eB0Fbc0537369af5dcCD78D799AfD3C6F5D4EE
- **IdentityRegistry**: 0x8004A818BFB912233c491871b3d84c89A494BD9e
- **ReputationRegistry**: 0x8004B663056A597Dffe9eCcC1965A193B7388713

## 📋 Usage Example

```typescript
const sdk = new VeritasSDK({
  provider,
  signer,
  network: 'sepolia',
  validationRegistryAddress: '0xC5eB0Fbc0537369af5dcCD78D799AfD3C6F5D4EE'
});

// Generate attestation with 3 on-chain checks
const result = await sdk.generateAndSubmitAttestation(agentId, {
  url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
  method: 'GET',
  extracts: [{ key: 'btcPrice', path: '$.data.rates.USD' }]
});

// Result includes on-chain verification
console.log(result.verification);
// { check2: true, check3: true, check4: true, overall: true }

// Query reputation (given by contract)
const reputation = await sdk.getReputationSummary(
  agentId,
  ['0xC5eB0Fbc0537369af5dcCD78D799AfD3C6F5D4EE']
);
```

## ⚠️ Note

Primus Network SDK chain support may require specific configuration. The contract and SDK are ready - attestation generation depends on Primus SDK compatibility.
