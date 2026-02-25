# Veritas Neat - 真实测试流程

## 📋 测试架构

```
┌─────────────────────────────────────────┐
│  一次性部署（完成后地址固定）             │
│  ┌────────────────────────────────────┐ │
│  │ 1. RuleRegistry                    │ │
│  │ 2. HTTPCheck                       │ │
│  │ 3. VeritasValidator                │ │
│  │ 4. 创建规则                        │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  真实测试（可多次进行）                  │
│  ┌────────────────────────────────────┐ │
│  │ 1. zktls: 生成 attestation         │ │
│  │    - 调用真实 API                   │ │
│  │    - 生成加密证明                   │ │
│  │                                    │ │
│  │ 2. validate: 验证 attestation      │ │
│  │    - 检查 recipient                │ │
│  │    - Primus 链上验证               │ │
│  │    - 执行 Check 规则               │ │
│  │    - 返回 passed/failed            │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🚀 第一步：一次性部署

### 部署合约

```bash
npx hardhat run scripts/deploy-base-sepolia.ts --network baseSepolia
```

**部署后的固定地址**:
- RuleRegistry: `0xABC...`（固定）
- HTTPCheck: `0xDEF...`（固定）
- VeritasValidator: `0x123...`（固定）

**创建的规则**:
- Rule 1: Trading API - POST
- Rule 2: Market Data - GET
- Rule 3: General API - GET

**部署后这些地址和规则就固定了，不需要再部署！**

---

## 🧪 第二步：真实测试

### 测试 1: zktls - Trading API

**测试目标**: 生成订单创建的 attestation

**API 调用**:
```typescript
// 调用真实的 Trading API
POST https://api.trading.com/orders
Body: {
  "symbol": "ETH",
  "amount": 100,
  "type": "limit"
}
```

**zktls 操作**:
```typescript
import { PrimusZKTLS } from '@primus-labs/zktls-core-sdk';

const primus = new PrimusZKTLS({
  appId: 'your-app-id',
  appSecret: 'your-app-secret'
});

// 生成 attestation
const attestation = await primus.attest({
  recipient: '0xYourAddress...',  // 必须是您的地址
  url: 'https://api.trading.com/orders',
  method: 'POST',
  body: {
    symbol: 'ETH',
    amount: 100,
    type: 'limit'
  },
  responseResolves: [{
    keyName: 'orderId',
    parseType: 'JSON',
    parsePath: '$.data.orderId'
  }]
});
```

**测试的规则**:
- ✅ 调用真实 API: `https://api.trading.com/orders`
- ✅ HTTP 方法: `POST`
- ✅ 请求体: 订单数据
- ✅ ParsePath: 提取 `orderId`

**预期的 attestation 内容**:
```json
{
  "recipient": "0xYourAddress...",
  "request": {
    "url": "https://api.trading.com/orders",
    "method": "POST",
    "body": "{\"symbol\":\"ETH\",\"amount\":100,\"type\":\"limit\"}"
  },
  "responseResolve": [{
    "keyName": "orderId",
    "parseType": "JSON",
    "parsePath": "$.data.orderId"
  }],
  "data": "{\"data\":{\"orderId\":\"12345\"}}",
  "signatures": ["0x..."]
}
```

---

### 测试 2: validate - Trading API 规则

**测试目标**: 验证 attestation 是否符合 Rule 1

**调用 validate**:
```typescript
const result = await validator.validate(
  attestation,  // zktls 生成的 attestation
  1             // Rule 1: Trading API - POST
);
```

**验证的规则（Rule 1）**:

1. **Recipient 检查**:
   ```
   attestation.recipient == msg.sender
   ```
   - ✅ 只有 attestation 的所有者才能提交

2. **Primus 链上验证**:
   ```solidity
   PrimusZKTLS.verifyAttestation(attestation)
   ```
   - ✅ 签名验证
   - ✅ TLS 握手验证
   - ✅ 数据完整性
   - ✅ ParsePath 结构

3. **HTTPCheck 规则验证（Rule 1）**:
   ```solidity
   HTTPCheck.validate(attestation, checkData)
   ```
   
   **CheckData 参数**:
   ```
   expectedUrl: "https://api.trading.com/orders"
   expectedMethod: "POST"
   minResponseCode: 200
   maxResponseCode: 201
   expectedDataPattern: 0x (无)
   validateParsePath: true
   ```
   
   **验证步骤**:
   - ✅ URL 匹配: `https://api.trading.com/orders`
   - ✅ 方法匹配: `POST`
   - ✅ ParsePath 合法: `$.data.orderId`

**预期结果**:
```
passed: true
attestationHash: 0x...
```

---

### 测试 3: zktls - Market Data API

**测试目标**: 生成价格查询的 attestation

**API 调用**:
```typescript
// 调用真实的市场数据 API
GET https://api.market.com/prices/ETH
```

**zktls 操作**:
```typescript
const attestation = await primus.attest({
  recipient: '0xYourAddress...',
  url: 'https://api.market.com/prices/ETH',
  method: 'GET',
  responseResolves: [{
    keyName: 'price',
    parseType: 'JSON',
    parsePath: '$.data.price'
  }]
});
```

**测试的规则**:
- ✅ 调用真实 API: `https://api.market.com/prices/ETH`
- ✅ HTTP 方法: `GET`
- ✅ ParsePath: 提取 `price`

**预期的 attestation 内容**:
```json
{
  "recipient": "0xYourAddress...",
  "request": {
    "url": "https://api.market.com/prices/ETH",
    "method": "GET"
  },
  "responseResolve": [{
    "keyName": "price",
    "parseType": "JSON",
    "parsePath": "$.data.price"
  }],
  "data": "{\"data\":{\"price\":3500.50}}",
  "signatures": ["0x..."]
}
```

---

### 测试 4: validate - Market Data 规则

**测试目标**: 验证 attestation 是否符合 Rule 2

**调用 validate**:
```typescript
const result = await validator.validate(
  attestation,  // zktls 生成的 attestation
  2             // Rule 2: Market Data - GET
);
```

**验证的规则（Rule 2）**:

1. **Recipient 检查**: ✅ 同上

2. **Primus 链上验证**: ✅ 同上

3. **HTTPCheck 规则验证（Rule 2）**:
   
   **CheckData 参数**:
   ```
   expectedUrl: "https://api.market.com/*"
   expectedMethod: "GET"
   minResponseCode: 200
   maxResponseCode: 299
   expectedDataPattern: "price":" (必须包含价格字段)
   validateParsePath: true
   ```
   
   **验证步骤**:
   - ✅ URL 匹配: `https://api.market.com/*` (通配符)
   - ✅ 方法匹配: `GET`
   - ✅ 数据模式匹配: 响应包含 `"price":"`
   - ✅ ParsePath 合法: `$.data.price`

**预期结果**:
```
passed: true
attestationHash: 0x...
```

---

## 📊 测试规则总结

### zktls 测试了什么？

| API | URL | 方法 | 提取字段 |
|-----|-----|------|---------|
| **Trading API** | `https://api.trading.com/orders` | POST | `orderId` |
| **Market Data** | `https://api.market.com/prices/ETH` | GET | `price` |

### validate 测试了什么规则？

| Rule ID | 规则名称 | URL 匹配 | 方法匹配 | 数据模式 | ParsePath |
|---------|---------|----------|----------|---------|-----------|
| **1** | Trading API | 精确匹配 | POST | 无 | ✅ |
| **2** | Market Data | 通配符 | GET | `"price":"` | ✅ |
| **3** | General API | 通配符 | GET | 无 | ❌ |

---

## 🔄 完整测试流程

### 步骤 1: 部署合约（一次性）

```bash
npx hardhat run scripts/deploy-base-sepolia.ts --network baseSepolia
```

**部署后记录地址**:
- VeritasValidator: `0x...`
- 规则已创建: Rule 1, 2, 3

---

### 步骤 2: 测试 Trading API

**2.1 生成 attestation**:
```typescript
const attestation = await primus.attest({
  recipient: yourAddress,
  url: 'https://api.trading.com/orders',
  method: 'POST',
  body: { symbol: 'ETH', amount: 100 }
});
```

**2.2 验证 attestation**:
```typescript
const result = await validator.validate(attestation, 1);
console.log(result.passed); // true
```

---

### 步骤 3: 测试 Market Data API

**3.1 生成 attestation**:
```typescript
const attestation = await primus.attest({
  recipient: yourAddress,
  url: 'https://api.market.com/prices/ETH',
  method: 'GET'
});
```

**3.2 验证 attestation**:
```typescript
const result = await validator.validate(attestation, 2);
console.log(result.passed); // true
```

---

## ✅ 总结

**合约部署**:
- 一次性部署，地址固定
- 3 个规则已创建

**zktls 测试**:
- 测试真实 API 调用
- 生成加密证明
- 提取指定字段

**validate 测试**:
- 测试规则 1: Trading API (POST)
- 测试规则 2: Market Data (GET)
- 返回 passed/failed

**现在清楚了吗？** 🎯
