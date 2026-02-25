# 完整真实测试准备清单

## ✅ 已准备好的

### 1. 智能合约
- ✅ RuleRegistry
- ✅ VeritasValidator
- ✅ HTTPCheck
- ✅ 所有合约已编译

### 2. 脚本
- ✅ deploy-real-apis.ts (部署脚本)
- ✅ test-real-apis.ts (测试脚本)

### 3. API 规则
- ✅ CoinGecko API (ETH 价格)
- ✅ Binance API (BTC 价格)
- ✅ JSONPlaceholder API (测试)

### 4. 网络配置
- ✅ Base Sepolia RPC: https://sepolia.base.org
- ✅ Primus ZKTLS: 0xC02234058caEaA9416506eABf6Ef3122fCA939E8

---

## ❌ 需要提供的

### 1. Primus 凭证 (必需)

**如何获取**:
1. 访问: https://docs.primuslabs.xyz/
2. 注册账号
3. 创建应用
4. 获取 App ID 和 App Secret

**需要的信息**:
```bash
PRIMUS_APP_ID=your_app_id_here
PRIMUS_APP_SECRET=your_app_secret_here
```

**⚠️ 重要**: 没有这个无法生成 attestation！

---

### 2. 测试账户 (必需)

**需要的信息**:
```bash
# 部署者私钥 (需要有 Base Sepolia ETH)
PRIVATE_KEY=your_private_key_here

# 或者助记词
MNEMONIC=your_mnemonic_here
```

**⚠️ 安全提示**:
- 只使用测试账户
- 不要使用主网私钥
- 确保 Base Sepolia ETH 足够

---

### 3. Base Sepolia ETH (必需)

**获取方式**:
- https://faucet.triangleplatform.com/base-sepolia/
- https://faucet.base.org/

**需要数量**: 约 0.01 ETH (足够部署和测试)

**⚠️ 检查余额**:
```bash
# 检查账户余额
npx hardhat run scripts/check-balance.ts --network baseSepolia
```

---

## 🔧 可选配置

### 1. RPC 端点 (可选)

默认使用公共 RPC，但可能限流：

```bash
# 推荐: 使用 Alchemy 或 Infura
BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 2. Etherscan API Key (可选)

用于验证合约:

```bash
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## 📝 环境配置文件

创建 `.env` 文件:

```bash
# 网络配置
BASE_SEPOLIA_RPC=https://sepolia.base.org

# 部署者私钥
PRIVATE_KEY=your_private_key_here

# Primus 凭证
PRIMUS_APP_ID=your_app_id
PRIMUS_APP_SECRET=your_app_secret

# 可选: Etherscan
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## 🚀 测试流程

### 步骤 1: 配置环境

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件，填入你的信息
nano .env  # 或使用其他编辑器
```

**必须填入**:
- ✅ PRIVATE_KEY
- ✅ PRIMUS_APP_ID
- ✅ PRIMUS_APP_SECRET

---

### 步骤 2: 安装依赖

```bash
npm install
```

---

### 步骤 3: 部署合约

```bash
npx hardhat run scripts/deploy-real-apis.ts --network baseSepolia
```

**预期输出**:
```
✅ RuleRegistry: 0x...
✅ HTTPCheck: 0x...
✅ VeritasValidator: 0x...
✅ Rule 1 created (CoinGecko)
✅ Rule 2 created (Binance)
✅ Rule 3 created (JSONPlaceholder)
```

**记录部署地址**:
```bash
# 添加到 .env
VALIDATOR_ADDRESS=0x...
```

---

### 步骤 4: 运行真实测试

```bash
npx hardhat run scripts/test-real-apis.ts --network baseSepolia
```

**预期输出**:
```
✅ Test 1: CoinGecko API - ETH Price
   - Attestation generated
   - Validation passed

✅ Test 2: Binance API - BTC Price
   - Attestation generated
   - Validation passed

✅ Test 3: JSONPlaceholder - Create Post
   - Attestation generated
   - Validation passed
```

---

## 🔍 验证清单

### 部署前
- [ ] .env 文件已创建
- [ ] PRIVATE_KEY 已填入
- [ ] PRIMUS_APP_ID 已填入
- [ ] PRIMUS_APP_SECRET 已填入
- [ ] 账户有 Base Sepolia ETH

### 部署后
- [ ] RuleRegistry 地址已记录
- [ ] VeritasValidator 地址已记录
- [ ] 3 个规则已创建
- [ ] VALIDATOR_ADDRESS 已添加到 .env

### 测试时
- [ ] zktls 能生成 attestation
- [ ] CoinGecko API 可访问
- [ ] Binance API 可访问
- [ ] JSONPlaceholder API 可访问
- [ ] validate 能验证 attestation

---

## 📊 预期结果

### 成功标志

1. **部署成功**:
   - 所有合约部署完成
   - 3 个规则创建成功

2. **zktls 成功**:
   - 能生成 attestation
   - attestation 包含正确数据
   - 签名有效

3. **validate 成功**:
   - 所有测试通过
   - 返回 `passed: true`
   - Gas 费用合理

---

## ⚠️ 常见问题

### 1. Primus 凭证问题

**症状**: 无法生成 attestation

**解决**:
- 检查 APP_ID 和 APP_SECRET 是否正确
- 确认 Primus 账号已激活
- 检查网络连接

### 2. ETH 不足

**症状**: 交易失败，out of gas

**解决**:
- 从水龙头获取更多 ETH
- 检查账户余额

### 3. 网络问题

**症状**: 无法连接到 Base Sepolia

**解决**:
- 尝试其他 RPC 端点
- 检查网络连接
- 使用 VPN（如果需要）

---

## 📞 需要帮助？

如果你遇到问题，请提供：
1. 错误消息
2. 你当前的 .env 配置（隐藏敏感信息）
3. 你执行的具体命令
4. 预期结果 vs 实际结果

---

## ✅ 准备完成？

确认以下信息已准备好：

**必须**:
- [ ] PRIVATE_KEY
- [ ] PRIMUS_APP_ID
- [ ] PRIMUS_APP_SECRET
- [ ] Base Sepolia ETH (≥ 0.01 ETH)

**可选**:
- [ ] BASE_SEPOLIA_RPC (自定义 RPC)
- [ ] ETHERSCAN_API_KEY (合约验证)

---

**一旦准备好这些信息，就可以开始完整测试了！** 🚀
