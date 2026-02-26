# Veritas SDK 完整测试报告

## 测试时间
2026-02-25

## 合约部署

### 部署地址 (Base Sepolia)

| 合约 | 地址 |
|------|------|
| RuleRegistry | `0xA03F539830fD53A7E1345b2BC815f3A66e19bC35` |
| HTTPCheck | `0xD3a3fA724C2436792a647528fb32fd38b7E94083` |
| JSONPathCheck | `0x2E68F81b23cA61DFC251205283B7217654D73859` |
| VeritasValidator | `0xca215CAaDa2d446481466b3D55eb152426065f9A` |
| PrimusZKTLS | `0xCE7cefB3B5A7eB44B59F60327A53c9Ce53B0afdE` |

### 规则配置

| 规则ID | 名称 | URL Template | DataKey | ParsePath | maxAge |
|--------|------|--------------|---------|-----------|--------|
| 1 | Binance BTC Price | `https://api.binance.com/*` | price | `$.price` | 3600s |
| 2 | Binance ETH Price | `https://api.binance.com/*` | price | `$.price` | 1800s |

## 测试详情

### 测试 1: BTC 价格验证 (Rule 1)

#### 请求配置
```javascript
{
  url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
  method: 'GET',
  responseResolves: [{
    keyName: 'price',
    parsePath: '$.price'
  }]
}
```

#### 生成的 Attestation

**Attestation 元数据:**
- Timestamp: 2026-02-25T18:10:41.513Z
- Local Verified: **true**
- Hash: `0xa68b9f37b422b1e8763f38fcc2c7941d7da9ebc61a8335e5e79047ad8ee2d15f`

**完整的 Attestation 结构:**

```typescript
{
  recipient: "0x89BBf3451643eef216c3A60d5B561c58F0D8adb9",
  request: {
    url: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
    header: "",
    method: "GET",
    body: ""
  },
  reponseResolve: [
    {
      keyName: "price",
      parseType: "string",
      parsePath: "$.price"
    }
  ],
  data: '{"price":""68702.26000000""}',
  attConditions: "",
  timestamp: 1772043041513n,  // 毫秒时间戳
  additionParams: "",
  attestors: [
    {
      attestorAddr: "0x0DE886e31723e64Aa72e51977B14475fB66a9f72",
      url: "wss://api2.padolabs.org/algoproxy"
    }
  ],
  signatures: [
    "0xd46654a8978ff3ee1836ea0e4b1...26ac2bce1b"
  ]
}
```

#### 链上验证结果

- **Status**: ✅ Passed
- **Block Number**: 38137406
- **Gas Used**: 294,509
- **Transaction Hash**: `0x2a4c0c9ba1c27f7c61ba7545f9d7c66d86c43ae6c5f7ba52d4ab2a8f0cd1c85`

---

### 测试 2: ETH 价格验证 (Rule 2)

#### 请求配置
```javascript
{
  url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
  method: 'GET',
  responseResolves: [{
    keyName: 'price',
    parsePath: '$.price'
  }]
}
```

#### 生成的 Attestation

**Attestation 元数据:**
- Timestamp: 2026-02-25T18:11:48.346Z
- Local Verified: **true**
- Hash: `0xfdd09312904d89763c368c5ac1011ed034bb908dde35672ec9c78333d7e6b27e`

**Response Data:**
```json
{"price":""2071.78000000""}
```

#### 链上验证结果

- **Status**: ✅ Passed
- **Block Number**: 38137412
- **Gas Used**: 294,514
- **Transaction Hash**: `0x0b8ce224e7e7301fc6df8f18137356ec3a7de577aead280837f5f2e1c14ab073`

---

## Attestation 字段详解

### 1. Recipient
- **类型**: `address`
- **说明**: Attestation 的接收者地址，即调用验证的账户地址
- **示例**: `0x89BBf3451643eef216c3A60d5B561c58F0D8adb9`

### 2. Request
- **类型**: `AttNetworkRequest`
- **包含字段**:
  - `url`: 请求的完整 URL
  - `method`: HTTP 方法 (GET/POST/等)
  - `header`: 请求头 (序列化)
  - `body`: 请求体 (序列化)

### 3. ResponseResolves
- **类型**: `AttNetworkResponseResolve[]`
- **说明**: 定义如何从响应中提取数据
- **包含字段**:
  - `keyName`: 数据键名
  - `parseType`: 解析类型 (string/number等)
  - `parsePath`: JSONPath 路径

### 4. Data
- **类型**: `string`
- **说明**: 从 API 响应中提取的实际数据
- **示例**: `{"price":""68702.26000000""}`

### 5. Timestamp
- **类型**: `uint64` (毫秒)
- **说明**: Attestation 生成时间
- **注意**: 智能合约中需要转换为秒进行验证

### 6. Attestors
- **类型**: `Attestor[]`
- **说明**: 执行 attestation 的节点信息
- **包含字段**:
  - `attestorAddr`: 节点地址
  - `url`: 节点 WebSocket URL

### 7. Signatures
- **类型**: `bytes[]`
- **说明**: Primus 节点对 attestation 的签名
- **用途**: 在链上验证 attestation 的真实性

---

## 验证流程

```
1. SDK 生成 Attestation
   ├─ 构造 API 请求
   ├─ 发送到 Primus 网络
   ├─ Primus 节点执行 TLS 连接
   ├─ 提取响应数据
   └─ 生成签名

2. SDK 本地验证
   └─ 验证 Primus 签名

3. 链上验证
   ├─ 验证 Recipient
   ├─ 验证 Timestamp (maxAge)
   ├─ 验证 Primus 签名
   ├─ 调用 Check 合约
   │  ├─ 验证 URL 匹配
   │  ├─ 验证 HTTP 方法
   │  ├─ 验证 DataKey 存在
   │  └─ 验证 ParsePath
   └─ 存储验证结果
```

---

## 代码仓库

**分支**: `veritas-simplified`
**提交**: `87fd2bb`

### 清理后的文件结构
```
contracts/
├── RuleRegistry.sol          # 规则注册表
├── VeritasValidator.sol      # 主验证合约
├── checks/
│   ├── HTTPCheck.sol         # HTTP 基础检查
│   └── JSONPathCheck.sol     # JSON 高级检查
├── interfaces/
│   └── ICustomCheck.sol      # 检查合约接口
└── mocks/
    └── IPrimusZKTLS.sol      # Primus 接口

src/sdk/
└── index.ts                  # TypeScript SDK

scripts/
├── deploy.js                 # 部署脚本
├── create-rules.js           # 创建规则脚本
├── test-sdk.js               # SDK 测试脚本
└── ...

deployed-config.json          # 部署配置
```

---

## 总结

✅ **所有测试通过**
- SDK 成功生成 attestations
- 本地签名验证通过
- 链上验证通过
- 不同规则使用不同配置正常工作
