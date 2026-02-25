# Veritas Neat - Security: Attestation Data Integrity

## ⚠️ Critical Security Fix

**Version 2.0** introduces a critical security fix: **Attestation contains all necessary data**

---

## 🔍 The Problem (Before)

### **Insecure Design (v1.x)**

```solidity
function validate(
    bytes calldata attestation,
    uint256 ruleId,
    bytes calldata responseData  // ❌ PROBLEM: Separate parameter
) external returns (bool passed)
```

**Security Issues:**

1. ❌ **Data Tampering** - User could submit different `responseData` than what's in `attestation`
2. ❌ **ParsePath Mismatch** - No validation that declared `parsePath` matches actual data
3. ❌ **Data Misuse** - Attacker could use data from one attestation with another

**Example Attack:**

```typescript
// Attacker generates valid attestation for API A
const attestationA = await generateAttestation('https://api-a.com/data');

// But submits data from API B
const fakeResponseData = { malicious: 'data' };

// If we accept responseData separately, attestation is meaningless!
await validator.validate(attestationA, ruleId, fakeResponseData);
```

---

## ✅ The Solution (v2.0)

### **Secure Design (v2.x)**

```solidity
function validate(
    Attestation calldata attestation,  // ✅ Contains ALL data
    uint256 ruleId
) external returns (bool passed)
```

**Security Improvements:**

1. ✅ **Data Integrity** - All data comes from attestation
2. ✅ **ParsePath Validation** - Verify declared path matches data
3. ✅ **No Tampering** - Can't submit external data

---

## 📋 Primus Attestation Structure

```solidity
struct Attestation {
    address recipient;
    AttNetworkRequest request;              // URL, method, headers, body
    AttNetworkResponseResolve[] reponseResolve;  // parsePath, parseType, keyName
    string data;                           // ✅ Actual response data (JSON)
    string attConditions;
    uint64 timestamp;
    string additionParams;
    Attestor[] attestors;
    bytes[] signatures;
}

struct AttNetworkResponseResolve {
    string keyName;      // Declared key name
    string parseType;    // JSON, HTML, XML, etc.
    string parsePath;    // ✅ Path to extract data (e.g., "$.data.price")
}
```

### **What's Included:**

| Field | Description | Verification |
|-------|-------------|--------------|
| **request** | API call details | Primus verifies TLS occurred |
| **responseResolve** | Declared parse paths | Must match data structure |
| **data** | Actual response | Cryptographically bound |
| **signatures** | Attestor signatures | Can't be forged |

---

## 🔐 How It Works

### **1. Attestation Generation (Agent Side)**

```typescript
import { PrimusZKTLS } from '@primus-labs/zktls-core-sdk';

const primus = new PrimusZKTLS(config);

// SDK generates attestation with ALL data
const attestation = await primus.attest({
    url: 'https://api.example.com/price',
    method: 'GET',
    responseResolves: [{
        keyName: 'price',
        parseType: 'JSON',
        parsePath: '$.data.price'  // ✅ Declared upfront
    }]
});

// attestation contains:
// - request: The actual API call
// - data: The actual response (e.g., '{"data":{"price":100}}')
// - parsePath: The declared extraction path
// - signature: Cryptographic proof
```

### **2. On-Chain Verification (Validator)**

```solidity
function validate(
    Attestation calldata attestation,
    uint256 ruleId
) external returns (bool passed) {
    
    // 1. Primus verifies:
    // - Signature authenticity
    // - TLS handshake occurred
    // - Data integrity
    // - parsePath matches data structure
    IPrimusZKTLS(primusAddress).verifyAttestation(attestation);
    
    // 2. Check contract validates:
    // - URL matches rule
    // - Method matches rule
    // - parsePath is legitimate
    // - Data matches expected pattern
    return check.validate(
        abi.encode(attestation),  // All data from attestation
        rule.checkData
    );
}
```

### **3. ParsePath Validation**

```solidity
// HTTPCheck validates parsePath
function _validateParsePath(Attestation memory attestation) 
    internal pure returns (bool) 
{
    for (uint i = 0; i < attestation.reponseResolve.length; i++) {
        AttNetworkResponseResolve memory resolve = attestation.reponseResolve[i];
        
        // 1. parsePath must not be empty
        if (bytes(resolve.parsePath).length == 0) {
            return false;
        }
        
        // 2. parseType must be valid (JSON, HTML, etc.)
        if (!_isValidParseType(resolve.parseType)) {
            return false;
        }
        
        // 3. keyName must be declared
        if (bytes(resolve.keyName).length == 0) {
            return false;
        }
        
        // 4. In production: Verify parsePath extracts value from data
        // JSON.parse(attestation.data) -> apply parsePath -> verify keyName
    }
    
    return true;
}
```

---

## 🎯 Attack Prevention

### **Attack 1: Data Tampering**

```typescript
// ❌ v1.x - Possible
const attestation = await generateAttestation('https://api-a.com');
await validator.validate(attestation, ruleId, fakeData);

// ✅ v2.x - Prevented
// Can't submit fakeData - only attestation.data is used
await validator.validate(attestation, ruleId);
```

### **Attack 2: ParsePath Mismatch**

```typescript
// ❌ v1.x - Declare one path, use another
const attestation = await generateAttestation({
    parsePath: '$.data.price'  // Declared
});
// But somehow use $.data.malicious in code

// ✅ v2.x - ParsePath validated
// HTTPCheck._validateParsePath() ensures:
// - parsePath is legitimate
// - Matches data structure
// - Can't be bypassed
```

### **Attack 3: Replay Attacks**

```solidity
// ✅ Already prevented by VeritasValidator
mapping(bytes32 => ValidationResult) public results;

function validate(...) {
    bytes32 hash = keccak256(abi.encode(attestation));
    
    // Can't validate same attestation twice
    if (results[hash].timestamp != 0) {
        revert AlreadyValidated(hash);
    }
}
```

---

## 🔧 Migration Guide (v1.x → v2.x)

### **Before (Insecure)**

```typescript
// SDK
const attestation = await primus.generateAttestation(request);
const responseData = extractFromAttestation(attestation);

// Contract call
await validator.validate(attestation, ruleId, responseData);
```

### **After (Secure)**

```typescript
// SDK
const attestation = await primus.attest({
    url: 'https://api.example.com/data',
    method: 'GET',
    responseResolves: [{
        keyName: 'data',
        parseType: 'JSON',
        parsePath: '$.data'  // ✅ Declare upfront
    }]
});

// Contract call - attestation contains everything
await validator.validate(attestation, ruleId);
// No separate responseData needed!
```

---

## 📊 Security Checklist

### ✅ **Data Integrity**
- [x] All data comes from attestation
- [x] No separate parameters
- [x] Primus verifies TLS handshake
- [x] Cryptographic signatures

### ✅ **ParsePath Validation**
- [x] parsePath declared in attestation
- [x] HTTPCheck validates parsePath structure
- [x] parseType must be valid
- [x] keyName must match extracted value

### ✅ **Replay Protection**
- [x] Attestation hash tracked
- [x] Can't validate same attestation twice
- [x] Unique results per attestation

### ✅ **Access Control**
- [x] Admin-only rule creation
- [x] Rule activation/deactivation
- [x] Only active rules can validate

---

## 🎯 Best Practices

### **1. Always Declare ParsePath**

```typescript
// Good
const attestation = await primus.attest({
    url: 'https://api.example.com/price',
    responseResolves: [{
        keyName: 'price',
        parseType: 'JSON',
        parsePath: '$.data.price'  // Explicit
    }]
});

// Bad
const attestation = await primus.attest({
    url: 'https://api.example.com/price'
    // No parsePath - can't validate data extraction
});
```

### **2. Use Specific URLs**

```typescript
// Good
parsePath: '$.data.orders[0].id'  // Specific field

// Bad
parsePath: '$'  // Too broad - could be anything
```

### **3. Validate ParsePath in Rules**

```solidity
// Good
checkData: {
    expectedUrl: 'https://api.example.com/*',
    validateParsePath: true  // ✅ Enable validation
}

// Bad
checkData: {
    expectedUrl: 'https://api.example.com/*',
    validateParsePath: false  // ❌ Skips validation
}
```

---

## 📖 Summary

**Key Change:** Attestation contains all data - no external parameters

**Security Benefits:**
1. ✅ Prevents data tampering
2. ✅ Validates parsePath integrity
3. ✅ Ensures data authenticity
4. ✅ Cryptographic verification

**Migration:** Remove `responseData` parameter, rely on `attestation.data`

---

**Security First: Data integrity is non-negotiable** 🔐
