# Veritas Neat - Rules Guide

## 🎯 What are Rules?

Rules define **how to validate attestations** in Veritas Protocol. Each rule specifies:
- Which Check contract to use
- What parameters to validate against
- Active/inactive status

## 📋 Rule Structure

```solidity
struct Rule {
    uint256 id;              // Unique rule ID
    string name;             // Human-readable name
    string description;      // What this rule validates
    address checkContract;   // Check contract address
    bytes checkData;         // Encoded validation parameters
    bool active;             // Is this rule active?
    address creator;         // Who created it
    uint256 createdAt;       // When created
}
```

## 🔧 Current Rule Types

### **1. HTTPCheck Rule**

The only rule type currently implemented. Validates HTTP API calls.

#### **CheckData Structure**

```solidity
struct HTTPCheckData {
    string expectedUrl;             // URL pattern (supports wildcards)
    string expectedMethod;          // HTTP method (GET, POST, etc.)
    uint256 minResponseCode;        // Min response code (e.g., 200)
    uint256 maxResponseCode;        // Max response code (e.g., 299)
    bytes expectedResponsePattern;  // Response pattern (optional)
}
```

#### **Example Rule**

```typescript
// Create a rule for trading API
const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
  ['string', 'string', 'uint256', 'uint256', 'bytes'],
  [
    'https://api.trading.com/orders',  // URL
    'POST',                             // Method
    200,                                // Min code
    201,                                // Max code
    '0x'                                // No pattern check
  ]
);

await ruleRegistry.createRule(
  'Trading Orders API',
  'Verify order creation calls',
  httpCheckAddress,
  checkData
);
```

## 📊 How Rules Work

### **1. Rule Creation**

```typescript
// Only admins can create rules
await ruleRegistry.createRule(
  'Rule Name',
  'Rule Description',
  checkContractAddress,  // e.g., HTTPCheck
  encodedCheckData       // Validation parameters
);
// Returns: ruleId (e.g., 1, 2, 3...)
```

### **2. Rule Activation**

```typescript
// Rules are active by default
// Deactivate a rule
await ruleRegistry.updateRuleStatus(ruleId, false);

// Reactivate a rule
await ruleRegistry.updateRuleStatus(ruleId, true);
```

### **3. Validation Process**

```solidity
// When validating an attestation:
function validate(
    Attestation calldata attestation,
    uint256 ruleId,  // <-- Which rule to use
    bytes calldata responseData
) returns (bool passed, bytes32 attestationHash)
```

**Flow:**
1. Get rule from RuleRegistry
2. Verify attestation with Primus
3. Call check contract with rule.checkData
4. Return passed (true/false)

## 💡 Rule Examples

### **Example 1: Generic API Check**

```typescript
const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
  ['string', 'string', 'uint256', 'uint256', 'bytes'],
  [
    'https://api.example.com/*',  // Wildcard: any path
    'GET',                         // Only GET requests
    200,                           // Success code
    299,                           // Max success code
    '0x'                           // No pattern
  ]
);

await ruleRegistry.createRule(
  'Example API - GET',
  'Verify GET requests to example.com',
  httpCheckAddress,
  checkData
);
```

### **Example 2: Specific Endpoint**

```typescript
const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
  ['string', 'string', 'uint256', 'uint256', 'bytes'],
  [
    'https://api.trading.com/orders',  // Exact URL
    'POST',                             // Only POST
    200,                                // Created
    201,                                // Created
    '0x'                                // No pattern
  ]
);

await ruleRegistry.createRule(
  'Trading Orders - Create',
  'Verify order creation',
  httpCheckAddress,
  checkData
);
```

### **Example 3: Multiple Methods**

```typescript
// Rule for GET requests
await ruleRegistry.createRule(
  'Trading API - GET',
  'Verify GET requests',
  httpCheckAddress,
  encodeCheckData({
    url: 'https://api.trading.com/*',
    method: 'GET',
    minCode: 200,
    maxCode: 299,
    pattern: '0x'
  })
);

// Separate rule for POST requests
await ruleRegistry.createRule(
  'Trading API - POST',
  'Verify POST requests',
  httpCheckAddress,
  encodeCheckData({
    url: 'https://api.trading.com/*',
    method: 'POST',
    minCode: 200,
    maxCode: 201,
    pattern: '0x'
  })
);
```

### **Example 4: Response Pattern**

```typescript
// Check if response contains specific data
const pattern = ethers.toUtf8Bytes('"status":"success"');

const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
  ['string', 'string', 'uint256', 'uint256', 'bytes'],
  [
    'https://api.example.com/data',
    'POST',
    200,
    299,
    pattern  // Response must contain this
  ]
);

await ruleRegistry.createRule(
  'API with Pattern Check',
  'Verify response contains success status',
  httpCheckAddress,
  checkData
);
```

## 🔍 URL Pattern Matching

### **Wildcard Support**

```typescript
// Exact URL
'https://api.example.com/data'  // Matches exactly

// Wildcard (any path)
'https://api.example.com/*'     // Matches any path

// Multiple wildcards
'https://*.example.com/*'       // Matches any subdomain + any path
```

### **Pattern Matching Rules**

- `*` matches any sequence of characters
- Pattern at end: `https://api.example.com/*` matches all paths
- Exact match: `https://api.example.com/data` only that path

## 🎯 Best Practices

### **1. Rule Naming**

```typescript
// Good: Descriptive and specific
'Trading API - Orders - Create'
'Data API - Analytics - Query'

// Bad: Too generic
'API Rule'
'Check Rule'
```

### **2. URL Patterns**

```typescript
// Good: Specific enough
'https://api.trading.com/orders/*'

// Too broad: Could match unintended endpoints
'https://*.com/*'
```

### **3. Response Codes**

```typescript
// Good: Appropriate for endpoint
// For GET requests
minCode: 200, maxCode: 299

// For POST creating resources
minCode: 200, maxCode: 201

// Too permissive
minCode: 200, maxCode: 500  // Accepts errors as valid!
```

### **4. Multiple Rules**

```typescript
// Create separate rules for different scenarios
// Rule 1: GET requests
await ruleRegistry.createRule('API - GET', ..., ruleId1);

// Rule 2: POST requests
await ruleRegistry.createRule('API - POST', ..., ruleId2);

// Rule 3: DELETE requests
await ruleRegistry.createRule('API - DELETE', ..., ruleId3);
```

## 📖 Current Sample Rule

When you deploy Veritas Protocol, it creates a sample rule:

```typescript
{
  id: 1,
  name: 'Example API Verification',
  description: 'Verify API calls to example.com',
  checkContract: '0x...', // HTTPCheck address
  checkData: {
    expectedUrl: 'https://api.example.com/*',
    expectedMethod: 'POST',
    minResponseCode: 200,
    maxResponseCode: 299,
    expectedResponsePattern: '0x'
  },
  active: true,
  creator: deployer.address,
  createdAt: <timestamp>
}
```

## 🔮 Future Rule Types

### **Potential Extensions**

1. **DataCheck** - Validate data structure/fields
2. **TimeCheck** - Validate timestamps/deadlines
3. **SignatureCheck** - Validate additional signatures
4. **CompositeCheck** - Combine multiple checks

### **Creating Custom Rules**

```solidity
contract CustomCheck is ICheck {
    function validate(
        bytes calldata attestation,
        bytes calldata checkData,
        bytes calldata responseData
    ) external pure override returns (bool passed) {
        // Custom validation logic
        // Return true/false
    }
}
```

## 📊 Rule Management

### **Query Rules**

```typescript
// Get single rule
const rule = await ruleRegistry.getRule(ruleId);

// Get all rule IDs
const ruleIds = await ruleRegistry.getAllRuleIds();

// Get rule count
const count = await ruleRegistry.getRuleCount();
```

### **Admin Management**

```typescript
// Add admin
await ruleRegistry.addAdmin(newAdminAddress);

// Remove admin
await ruleRegistry.removeAdmin(adminAddress);

// Check if admin
const isAdmin = await ruleRegistry.admins(address);
```

## 🎯 Summary

**Current Rules:**
- ✅ **HTTPCheck** - Validates HTTP API calls
- 🔮 **Future** - DataCheck, TimeCheck, etc.

**Rule Components:**
- Name & Description
- Check Contract
- Validation Parameters (checkData)
- Active Status

**How to Use:**
1. Create rule with validation parameters
2. Reference rule by ID when validating
3. Get binary result: passed (true/false)

---

**Rules = Flexible Validation Logic** 🎯
