# Veritas Neat - 真实 API 测试规则

## 🎯 使用的真实 API

### 规则 1: CoinGecko API - 获取加密货币价格

**API 端点**: `https://api.coingecko.com/api/v3/simple/price`

**请求方式**: `GET`

**示例请求**:
```
GET https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd
```

**示例响应**:
```json
{
  "ethereum": {
    "usd": 3500.50
  }
}
```

**zktls 配置**:
```typescript
{
  recipient: yourAddress,
  url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
  method: 'GET',
  responseResolves: [{
    keyName: 'ethPrice',
    parseType: 'JSON',
    parsePath: '$.ethereum.usd'
  }]
}
```

**CheckData 参数**:
```solidity
{
  expectedUrl: "https://api.coingecko.com/api/v3/*",  // 通配符
  expectedMethod: "GET",
  minResponseCode: 200,
  maxResponseCode: 299,
  expectedDataPattern: "usd",
  validateParsePath: true
}
```

---

### 规则 2: Binance API - 获取交易对价格

**API 端点**: `https://api.binance.com/api/v3/ticker/price`

**请求方式**: `GET`

**示例请求**:
```
GET https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT
```

**示例响应**:
```json
{
  "symbol": "BTCUSDT",
  "price": "67000.50"
}
```

**zktls 配置**:
```typescript
{
  recipient: yourAddress,
  url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
  method: 'GET',
  responseResolves: [{
    keyName: 'btcPrice',
    parseType: 'JSON',
    parsePath: '$.price'
  }]
}
```

**CheckData 参数**:
```solidity
{
  expectedUrl: "https://api.binance.com/api/v3/*",
  expectedMethod: "GET",
  minResponseCode: 200,
  maxResponseCode: 299,
  expectedDataPattern: "price",
  validateParsePath: true
}
```

---

### 规则 3: JSONPlaceholder - 测试 API (通用)

**API 端点**: `https://jsonplaceholder.typicode.com/posts`

**请求方式**: `POST`

**示例请求**:
```
POST https://jsonplaceholder.typicode.com/posts
Body: {
  "title": "Test",
  "body": "Test content",
  "userId": 1
}
```

**示例响应**:
```json
{
  "id": 101,
  "title": "Test",
  "body": "Test content",
  "userId": 1
}
```

**zktls 配置**:
```typescript
{
  recipient: yourAddress,
  url: 'https://jsonplaceholder.typicode.com/posts',
  method: 'POST',
  body: {
    title: "Test",
    body: "Test content",
    userId: 1
  },
  responseResolves: [{
    keyName: 'postId',
    parseType: 'JSON',
    parsePath: '$.id'
  }]
}
```

**CheckData 参数**:
```solidity
{
  expectedUrl: "https://jsonplaceholder.typicode.com/*",
  expectedMethod: "POST",
  minResponseCode: 200,
  maxResponseCode: 201,
  expectedDataPattern: "id",
  validateParsePath: true
}
```

---

## 📊 真实 API 总结

| Rule | API | URL | 方法 | 提取字段 |
|------|-----|-----|------|---------|
| **1** | CoinGecko | `https://api.coingecko.com/api/v3/*` | GET | ETH 价格 |
| **2** | Binance | `https://api.binance.com/api/v3/*` | GET | BTC 价格 |
| **3** | JSONPlaceholder | `https://jsonplaceholder.typicode.com/*` | POST | Post ID |

---

## ✅ 为什么选择这些 API？

1. **CoinGecko API**
   - ✅ 免费、公开
   - ✅ 无需 API Key
   - ✅ 稳定可靠
   - ✅ 响应格式清晰

2. **Binance API**
   - ✅ 免费、公开
   - ✅ 无需 API Key（公开端点）
   - ✅ 响应快速
   - ✅ 数据格式简单

3. **JSONPlaceholder**
   - ✅ 专为测试设计
   - ✅ 支持 GET/POST
   - ✅ 无需认证
   - ✅ 可预测的响应

---

## 🚀 测试示例

### 测试 1: CoinGecko - ETH 价格

```typescript
const attestation = await primus.attest({
  recipient: yourAddress,
  url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
  method: 'GET',
  responseResolves: [{
    keyName: 'ethPrice',
    parseType: 'JSON',
    parsePath: '$.ethereum.usd'
  }]
});

const result = await validator.validate(attestation, 1);
console.log('ETH Price Verified:', result.passed);
```

### 测试 2: Binance - BTC 价格

```typescript
const attestation = await primus.attest({
  recipient: yourAddress,
  url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
  method: 'GET',
  responseResolves: [{
    keyName: 'btcPrice',
    parseType: 'JSON',
    parsePath: '$.price'
  }]
});

const result = await validator.validate(attestation, 2);
console.log('BTC Price Verified:', result.passed);
```

### 测试 3: JSONPlaceholder - 创建 Post

```typescript
const attestation = await primus.attest({
  recipient: yourAddress,
  url: 'https://jsonplaceholder.typicode.com/posts',
  method: 'POST',
  body: {
    title: "Test Post",
    body: "This is a test",
    userId: 1
  },
  responseResolves: [{
    keyName: 'postId',
    parseType: 'JSON',
    parsePath: '$.id'
  }]
});

const result = await validator.validate(attestation, 3);
console.log('Post Created:', result.passed);
```

---

## 📝 API 可访问性验证

所有 API 都已经过验证，确保：
- ✅ 可以公开访问
- ✅ 无需 API Key
- ✅ 支持 CORS
- ✅ 响应格式稳定
- ✅ 适合测试使用

---

**这些是真实的、可访问的 API，可以立即用于测试！** 🎯
