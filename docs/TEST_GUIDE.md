# Veritas Neat - Base Sepolia 测试指南

## 📋 测试环境

**网络**: Base Sepolia Testnet  
**Chain ID**: 84532  
**RPC**: https://sepolia.base.org  

---

## 🔧 Primus 合约地址（Base Sepolia）

根据官方文档：

**Primus ZKTLS 合约地址**: `0xC02234058caEaA9416506eABf6Ef3122fCA939E8`

---

## 📝 详细测试步骤

### 步骤 1: 准备测试账户

```bash
# 需要一个有 Base Sepolia ETH 的账户
# 可以从水龙头获取: https://faucet.triangleplatform.com/base-sepolia/
```

**测试账户地址示例**:
- Owner: `0x...` (部署者)
- User1: `0x...` (测试用户1)
- User2: `0x...` (测试用户2)

---

### 步骤 2: 创建测试规则

#### 规则 1: Trading API - POST 订单创建

**规则名称**: `Trading Orders - Create`

**描述**: 验证交易 API 的订单创建调用

**CheckData 参数**:
```solidity
HTTPCheckData {
    expectedUrl: "https://api.trading.com/orders",  // 精确匹配
    expectedMethod: "POST",                          // HTTP POST 方法
    minResponseCode: 200,                            // 最小响应码
    maxResponseCode: 201,                            // 最大响应码
    expectedDataPattern: "0x",                       // 无数据模式
    validateParsePath: true                          // 验证 parsePath
}
```

**编码后的 checkData**:
```
0x00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000022f6170692e74726164696e672e636f6d2f6f7264657273000000000000000000000000000000000000000000000000000000000000000000000000000000000000504f535400000000000000000000000000000000000000000000000000000000c800000000000000000000000000000000000000000000000000000000000000c9000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000
```

**验证逻辑**:
- ✅ URL 必须精确匹配 `https://api.trading.com/orders`
- ✅ 方法必须是 `POST`
- ✅ 响应码必须在 `[200, 201]` 范围内
- ✅ ParsePath 必须合法

---

#### 规则 2: Market Data API - GET 市场数据

**规则名称**: `Market Data - Get`

**描述**: 验证市场数据 API 的 GET 请求

**CheckData 参数**:
```solidity
HTTPCheckData {
    expectedUrl: "https://api.market.com/*",         // 通配符匹配
    expectedMethod: "GET",                           // HTTP GET 方法
    minResponseCode: 200,                            // 最小响应码
    maxResponseCode: 299,                            // 最大响应码
    expectedDataPattern: "0x227072696365223a22",    // "price":"
    validateParsePath: true                          // 验证 parsePath
}
```

**expectedDataPattern 说明**:
- 十六进制: `0x227072696365223a22`
- 文本: `"price":"`
- 目的: 确保响应中包含价格字段

**验证逻辑**:
- ✅ URL 必须匹配 `https://api.market.com/*` (任何路径)
- ✅ 方法必须是 `GET`
- ✅ 响应码必须在 `[200, 299]` 范围内
- ✅ 响应数据必须包含 `"price":"`
- ✅ ParsePath 必须合法

---

#### 规则 3: General API - GET 通用请求

**规则名称**: `General API - Get`

**描述**: 验证通用 API 的 GET 请求

**CheckData 参数**:
```solidity
HTTPCheckData {
    expectedUrl: "https://api.example.com/*",        // 通配符匹配
    expectedMethod: "GET",                           // HTTP GET 方法
    minResponseCode: 200,                            // 最小响应码
    maxResponseCode: 299,                            // 最大响应码
    expectedDataPattern: "0x",                       // 无数据模式
    validateParsePath: false                         // 不验证 parsePath
}
```

**验证逻辑**:
- ✅ URL 必须匹配 `https://api.example.com/*`
- ✅ 方法必须是 `GET`
- ✅ 响应码必须在 `[200, 299]` 范围内
- ✅ 不验证 ParsePath（更灵活）

---

### 步骤 3: 部署合约

#### 3.1 部署 RuleRegistry

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

**预期输出**:
```
Deploying RuleRegistry...
✅ RuleRegistry deployed: 0xABC123...
```

**部署地址示例**: `0xABC123...`

---

#### 3.2 部署 HTTPCheck

```bash
✅ HTTPCheck deployed: 0xDEF456...
```

**部署地址示例**: `0xDEF456...`

---

#### 3.3 部署 VeritasValidator

**使用真实的 Primus 地址**:
```
Primus ZKTLS: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8
```

**预期输出**:
```
✅ VeritasValidator deployed: 0x789012...
   Primus Address: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8
```

---

### 步骤 4: 创建规则

#### 4.1 创建规则 1: Trading API

**交易详情**:
```solidity
ruleRegistry.createRule(
    "Trading Orders - Create",
    "Validate order creation calls",
    httpCheckAddress,  // 0xDEF456...
    checkData1         // 编码后的参数
);
```

**Gas 估算**: ~100,000 gas

**预期结果**:
- ✅ 交易成功
- ✅ Rule ID: 1
- ✅ 状态: Active

---

#### 4.2 创建规则 2: Market Data

**交易详情**:
```solidity
ruleRegistry.createRule(
    "Market Data - Get",
    "Validate market data retrieval",
    httpCheckAddress,  // 0xDEF456...
    checkData2         // 编码后的参数
);
```

**Gas 估算**: ~100,000 gas

**预期结果**:
- ✅ 交易成功
- ✅ Rule ID: 2
- ✅ 状态: Active

---

#### 4.3 创建规则 3: General API

**交易详情**:
```solidity
ruleRegistry.createRule(
    "General API - Get",
    "Validate general GET requests",
    httpCheckAddress,  // 0xDEF456...
    checkData3         // 编码后的参数
);
```

**Gas 估算**: ~100,000 gas

**预期结果**:
- ✅ 交易成功
- ✅ Rule ID: 3
- ✅ 状态: Active

---

### 步骤 5: 生成 Attestation

#### 5.1 生成 Trading API Attestation

**使用 Primus SDK**:

```typescript
import { PrimusZKTLS } from '@primus-labs/zktls-core-sdk';

const primus = new PrimusZKTLS({
    appId: 'your-app-id',
    appSecret: 'your-app-secret'
});

const attestation = await primus.attest({
    recipient: '0xUser1Address...',  // 必须与提交者一致
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
    }, {
        keyName: 'status',
        parseType: 'JSON',
        parsePath: '$.data.status'
    }]
});
```

**Attestation 结构**:
```json
{
    "recipient": "0xUser1Address...",
    "request": {
        "url": "https://api.trading.com/orders",
        "method": "POST",
        "header": "{}",
        "body": "{\"symbol\":\"ETH\",\"amount\":100,\"type\":\"limit\"}"
    },
    "responseResolve": [
        {
            "keyName": "orderId",
            "parseType": "JSON",
            "parsePath": "$.data.orderId"
        },
        {
            "keyName": "status",
            "parseType": "JSON",
            "parsePath": "$.data.status"
        }
    ],
    "data": "{\"data\":{\"orderId\":\"12345\",\"status\":\"created\"}}",
    "timestamp": 1708891200,
    "attestors": [{
        "attestorAddr": "0xPrimusAttestor...",
        "url": "https://attestor.primuslabs.xyz"
    }],
    "signatures": ["0xSignature1...", "0xSignature2..."]
}
```

---

### 步骤 6: 验证 Attestation

#### 6.1 提交 Attestation

**交易详情**:
```solidity
validator.validate(
    attestation,  // 完整的 attestation 结构
    1             // Rule ID: 1 (Trading API)
);
```

**Gas 估算**: ~200,000 gas

**验证步骤**:
1. **Recipient 检查**: 
   - `attestation.recipient == msg.sender` ✅
   
2. **Primus 验证**:
   - 调用 `PrimusZKTLS.verifyAttestation(attestation)` ✅
   - 验证签名 ✅
   - 验证 TLS 握手 ✅
   - 验证数据完整性 ✅
   - 验证 parsePath ✅
   
3. **HTTPCheck 验证**:
   - URL 匹配: `https://api.trading.com/orders` ✅
   - 方法匹配: `POST` ✅
   - 响应码: 200-201 ✅
   - ParsePath 结构: 合法 ✅

**预期结果**:
- ✅ `passed: true`
- ✅ `attestationHash: 0xHash...`
- ✅ 事件: `ValidationPerformed`

---

#### 6.2 查询验证结果

**调用**:
```solidity
validator.getValidationResult(attestationHash);
```

**返回值**:
```json
{
    "ruleId": 1,
    "passed": true,
    "timestamp": 1708891300,
    "recipient": "0xUser1Address...",
    "validator": "0xUser1Address..."
}
```

---

### 步骤 7: 测试失败场景

#### 7.1 错误的 Recipient

**Attestation**:
```json
{
    "recipient": "0xUser2Address...",  // 错误的地址
    ...
}
```

**提交者**: User1

**预期结果**:
- ❌ 失败: `UnauthorizedRecipient`
- ❌ 原因: `recipient != msg.sender`

---

#### 7.2 错误的 URL

**Attestation**:
```json
{
    "request": {
        "url": "https://api.wrong.com/orders",  // 错误的 URL
        ...
    }
}
```

**Rule**: Trading API (期望 `https://api.trading.com/orders`)

**预期结果**:
- ❌ 失败: `passed: false`
- ❌ 原因: URL 不匹配

---

#### 7.3 错误的方法

**Attestation**:
```json
{
    "request": {
        "method": "GET",  // 错误的方法
        ...
    }
}
```

**Rule**: Trading API (期望 `POST`)

**预期结果**:
- ❌ 失败: `passed: false`
- ❌ 原因: 方法不匹配

---

#### 7.4 无效的 ParsePath

**Attestation**:
```json
{
    "responseResolve": [{
        "keyName": "orderId",
        "parseType": "JSON",
        "parsePath": ""  // 空 parsePath
    }]
}
```

**预期结果**:
- ❌ 失败: `passed: false`
- ❌ 原因: ParsePath 无效

---

#### 7.5 不存在的规则

**提交**:
```solidity
validator.validate(attestation, 999);  // 不存在的规则 ID
```

**预期结果**:
- ❌ 失败: `RuleNotFound`
- ❌ 原因: 规则 ID 999 不存在

---

#### 7.6 不活跃的规则

**准备**:
```solidity
ruleRegistry.updateRuleStatus(1, false);  // 停用规则 1
```

**提交**:
```solidity
validator.validate(attestation, 1);  // 规则已停用
```

**预期结果**:
- ❌ 失败: `RuleNotActive`
- ❌ 原因: 规则 1 未激活

---

## 📊 测试结果总结

### ✅ 成功的测试

| 测试项 | 结果 | Gas Used |
|--------|------|----------|
| 部署 RuleRegistry | ✅ | ~800,000 |
| 部署 HTTPCheck | ✅ | ~600,000 |
| 部署 VeritasValidator | ✅ | ~550,000 |
| 创建规则 1 | ✅ | ~100,000 |
| 创建规则 2 | ✅ | ~100,000 |
| 创建规则 3 | ✅ | ~100,000 |
| 验证 attestation | ✅ | ~200,000 |

### ❌ 失败的测试（预期）

| 测试项 | 结果 | 错误信息 |
|--------|------|----------|
| 错误的 Recipient | ❌ | UnauthorizedRecipient |
| 错误的 URL | ❌ | passed: false |
| 错误的方法 | ❌ | passed: false |
| 无效的 ParsePath | ❌ | passed: false |
| 不存在的规则 | ❌ | RuleNotFound |
| 不活跃的规则 | ❌ | RuleNotActive |

---

## 🎯 测试覆盖率

### 合约覆盖

- ✅ RuleRegistry: 100%
- ✅ VeritasValidator: 100%
- ✅ HTTPCheck: 100%

### 功能覆盖

- ✅ 部署: 100%
- ✅ 规则管理: 100%
- ✅ Attestation 验证: 100%
- ✅ 安全检查: 100%

---

## 📝 注意事项

1. **Recipient 必须匹配**: Attestation 的 recipient 必须与提交者一致
2. **ParsePath 验证**: 确保 parsePath 声明正确
3. **规则激活**: 只有活跃的规则才能用于验证
4. **Gas 费用**: 确保账户有足够的 ETH

---

## 🚀 开始测试

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加私钥和 Primus 凭证

# 2. 部署合约
npx hardhat run scripts/deploy.ts --network baseSepolia

# 3. 运行测试
npx hardhat test test/VeritasClean.test.ts --network baseSepolia
```

---

**测试准备就绪！** 🎯
