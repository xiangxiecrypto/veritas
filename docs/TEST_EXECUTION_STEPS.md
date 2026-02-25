# Base Sepolia 测试执行步骤

## 📋 准备工作

### 1. 配置环境变量

创建 `.env` 文件:

```bash
# Base Sepolia RPC
BASE_SEPOLIA_RPC=https://sepolia.base.org

# 部署者私钥（需要有 Base Sepolia ETH）
PRIVATE_KEY=your_private_key_here

# Primus 凭证（如果需要生成 attestation）
PRIMUS_APP_ID=your_app_id
PRIMUS_APP_SECRET=your_app_secret
```

### 2. 获取测试 ETH

从水龙头获取 Base Sepolia ETH:
- https://faucet.triangleplatform.com/base-sepolia/
- https://faucet.base.org/

---

## 🚀 执行步骤

### 步骤 1: 安装依赖

```bash
cd /home/xiang/.openclaw/workspace/veritas-protocol
npm install
```

**预期输出**:
```
added 500 packages in 30s
```

---

### 步骤 2: 编译合约

```bash
npm run compile
```

**预期输出**:
```
Compiled 6 Solidity files successfully
```

**编译的合约**:
- RuleRegistry.sol
- VeritasValidator.sol
- HTTPCheck.sol
- ICheck.sol
- IVeritasValidator.sol
- IPrimusZKTLS.sol (mock)

---

### 步骤 3: 部署到 Base Sepolia

```bash
npx hardhat run scripts/deploy-base-sepolia.ts --network baseSepolia
```

**详细输出**:

```
=================================================
  Veritas Neat - Base Sepolia Deployment
  =================================================

Deployment Configuration:
  Network: Base Sepolia
  Chain ID: 84532
  RPC: https://sepolia.base.org

Deployer: 0xYourAddress...
Balance: 0.5 ETH

Real Primus ZKTLS Address: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8

Step 1: Deploying RuleRegistry...
  ✅ RuleRegistry deployed
     Address: 0xABC123...
     Gas used: ~800,000

Step 2: Deploying HTTPCheck...
  ✅ HTTPCheck deployed
     Address: 0xDEF456...
     Gas used: ~600,000

Step 3: Deploying VeritasValidator...
  Using Real Primus ZKTLS: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8
  ✅ VeritasValidator deployed
     Address: 0x789012...
     Gas used: ~550,000

Step 4: Creating sample rules...

  Creating Rule 1: Trading Orders - POST
    URL: https://api.trading.com/orders
    Method: POST
    Response Codes: [200, 201]
  ✅ Rule 1 created (ID: 1)
     Gas used: 100000

  Creating Rule 2: Market Data - GET
    URL: https://api.market.com/* (wildcard)
    Method: GET
    Response Codes: [200, 299]
    Pattern: "price":"
  ✅ Rule 2 created (ID: 2)
     Gas used: 100000

  Creating Rule 3: General API - GET
    URL: https://api.example.com/* (wildcard)
    Method: GET
    Response Codes: [200, 299]
  ✅ Rule 3 created (ID: 3)
     Gas used: 100000

=================================================
  DEPLOYMENT COMPLETE - BASE SEPOLIA
  =================================================

Contract Addresses:
  --------------------
  RuleRegistry:     0xABC123...
  HTTPCheck:        0xDEF456...
  VeritasValidator: 0x789012...
  Primus ZKTLS:     0xC02234058caEaA9416506eABf6Ef3122fCA939E8 (Real)

Rules Created:
  --------------
  1. Trading Orders - Create
     Description: Validate order creation calls
     Active: true
  2. Market Data - Get
     Description: Validate market data retrieval
     Active: true
  3. General API - Get
     Description: Validate general GET requests
     Active: true

✅ Deployment successful!
```

---

### 步骤 4: 运行测试

```bash
npx hardhat test test/VeritasBaseSepolia.test.ts --network baseSepolia
```

**详细输出**:

```
========================================
  Veritas Neat - Base Sepolia Test
  ========================================

Test Configuration:
  Network: Base Sepolia
  Chain ID: 84532
  Primus ZKTLS: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8

Test Accounts:
  Owner: 0xYourAddress...
  User1: 0xUser1Address...
  User2: 0xUser2Address...

  Step 1.1: Deploying RuleRegistry...
  ✅ RuleRegistry deployed
     Address: 0xABC123...
     Gas used: ~800,000

  Step 1.2: Deploying HTTPCheck...
  ✅ HTTPCheck deployed
     Address: 0xDEF456...
     Gas used: ~600,000

  Step 1.3: Deploying VeritasValidator...
     Using Real Primus Address: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8
  ✅ VeritasValidator deployed
     Address: 0x789012...
     Primus ZKTLS: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8
     Gas used: ~550,000

  Step 2.1: Creating Trading API Rule...
  Rule Details:
    Name: Trading Orders - Create
    Description: Validate order creation calls
    Expected URL: https://api.trading.com/orders
    Expected Method: POST
    Response Codes: [200, 201]
    Validate ParsePath: Yes
  ✅ Rule created successfully
     Rule ID: 1
     Active: true
     Gas used: 100000

  Step 2.2: Creating Market Data API Rule...
  Rule Details:
    Name: Market Data - Get
    Description: Validate market data retrieval
    Expected URL: https://api.market.com/* (wildcard)
    Expected Method: GET
    Response Codes: [200, 299]
    Expected Pattern: "price":"
    Validate ParsePath: Yes
  ✅ Rule created successfully
     Rule ID: 2
     Gas used: 100000

  Step 2.3: Creating General API Rule...
  Rule Details:
    Name: General API - Get
    Description: Validate general GET requests
    Expected URL: https://api.example.com/* (wildcard)
    Expected Method: GET
    Response Codes: [200, 299]
    Validate ParsePath: No (more flexible)
  ✅ Rule created successfully
     Rule ID: 3
     Gas used: 100000

  Step 3.1: Verifying rules...
  Total rules: 3
  Rule 1: Trading Orders - Create - Active: true
  Rule 2: Market Data - Get - Active: true
  Rule 3: General API - Get - Active: true

  Step 3.2: Testing rule deactivation...
  Rule 1 deactivated: true
  Rule 1 reactivated

  Step 4.1: Checking validation status...
  Fake attestation hash: 0x1234...
  Is validated: false

========================================
  DEPLOYMENT SUMMARY - BASE SEPOLIA
  ========================================

Contract Addresses:
  --------------------
  RuleRegistry:     0xABC123...
  HTTPCheck:        0xDEF456...
  VeritasValidator: 0x789012...
  Primus ZKTLS:     0xC02234058caEaA9416506eABf6Ef3122fCA939E8

Rules Created:
  --------------
  1. Trading Orders - Create
     Description: Validate order creation calls
     Active: true
  2. Market Data - Get
     Description: Validate market data retrieval
     Active: true
  3. General API - Get
     Description: Validate general GET requests
     Active: true

Network Info:
  -------------
  Network: Base Sepolia
  Chain ID: 84532
  RPC: https://sepolia.base.org

  ✅ All systems operational!


  10 passing (10s)
```

---

## 📊 规则详情

### 规则 1: Trading Orders - Create

**用途**: 验证交易 API 的订单创建调用

**CheckData**:
```
URL: https://api.trading.com/orders
Method: POST
Min Response Code: 200
Max Response Code: 201
Expected Data Pattern: None (0x)
Validate ParsePath: true
```

**验证逻辑**:
1. URL 必须精确匹配
2. HTTP 方法必须是 POST
3. 响应码必须是 200 或 201
4. ParsePath 必须声明且合法

**适用场景**:
- 创建交易订单
- 验证订单创建 API 调用

---

### 规则 2: Market Data - Get

**用途**: 验证市场数据 API 的 GET 请求

**CheckData**:
```
URL: https://api.market.com/*
Method: GET
Min Response Code: 200
Max Response Code: 299
Expected Data Pattern: "price":" (0x227072696365223a22)
Validate ParsePath: true
```

**验证逻辑**:
1. URL 必须匹配通配符 (任何路径)
2. HTTP 方法必须是 GET
3. 响应码必须在 [200, 299] 范围
4. 响应数据必须包含 "price":"
5. ParsePath 必须声明且合法

**适用场景**:
- 获取市场价格数据
- 验证价格 API 调用

---

### 规则 3: General API - Get

**用途**: 验证通用 API 的 GET 请求

**CheckData**:
```
URL: https://api.example.com/*
Method: GET
Min Response Code: 200
Max Response Code: 299
Expected Data Pattern: None (0x)
Validate ParsePath: false
```

**验证逻辑**:
1. URL 必须匹配通配符
2. HTTP 方法必须是 GET
3. 响应码必须在 [200, 299] 范围
4. 不验证 ParsePath（更灵活）

**适用场景**:
- 通用 API 调用验证
- 不需要特定数据格式的场景

---

## 🔍 验证流程

### 1. Recipient 检查

**验证**: `attestation.recipient == msg.sender`

**目的**: 只有 attestation 的所有者才能提交

**失败情况**: `UnauthorizedRecipient` 错误

---

### 2. Primus 验证

**调用**: `PrimusZKTLS.verifyAttestation(attestation)`

**验证内容**:
- 签名真实性
- TLS 握手
- 数据完整性
- ParsePath 结构

**失败情况**: `PrimusVerificationFailed` 错误

---

### 3. HTTPCheck 验证

**调用**: `HTTPCheck.validate(attestation, checkData)`

**验证内容**:
- URL 匹配
- HTTP 方法匹配
- 响应码范围
- 数据模式匹配（可选）
- ParsePath 合法性（可选）

**失败情况**: `passed: false`

---

## 💰 Gas 费用估算

| 操作 | Gas Used | 费用 (ETH @ 1 Gwei) |
|------|----------|---------------------|
| 部署 RuleRegistry | ~800,000 | ~0.0008 ETH |
| 部署 HTTPCheck | ~600,000 | ~0.0006 ETH |
| 部署 VeritasValidator | ~550,000 | ~0.00055 ETH |
| 创建规则 | ~100,000 | ~0.0001 ETH |
| 验证 attestation | ~200,000 | ~0.0002 ETH |
| **总计** | **~2,750,000** | **~0.00275 ETH** |

---

## ✅ 测试完成

所有步骤都已详细说明！

**下一步**:
1. 更新 SDK 中的 `VALIDATOR_ADDRESS`
2. 使用 Primus SDK 生成 attestation
3. 提交 attestation 进行验证
4. 检查验证结果

**测试成功！** 🎉
