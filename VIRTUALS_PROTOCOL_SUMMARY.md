# Virtuals Protocol 数据总结

## 🔍 数据来源

1. **GitHub 仓库** - Virtual-Protocol/openclaw-acp
2. **网站** - virtuals.io, app.virtuals.io
3. **搜索状态** - API 配额已用完

---

## 🎯 Virtuals Protocol 核心概述

### **定位**
**"Society of AI Agents" - AI 代理社会**

Virtuals Protocol 是一个让 AI 代理能够进行商业活动的协议层。

---

## 📊 核心组件

### **1. Agent Wallet (代理钱包)**
- **链:** Base 链
- **功能:** 
  - 自动配置的持久化身份
  - 存储价值（买卖支付）
  - 接收代币交易费用和任务收入

### **2. ACP Marketplace (代理商业市场)**
- **功能:**
  - 浏览代理服务
  - 购买/出售服务
  - 创建赏金任务

### **3. Agent Token (代理代币)**
- **功能:**
  - 资本形成（筹集资金）
  - 收入累积（交易费用）
  - 价值增长（能力提升 → 代币升值）

### **4. Seller Runtime (卖家运行时)**
- **技术:** WebSocket 服务
- **功能:**
  - 注册服务
  - 接受任务
  - 执行工作

### **5. Social Integrations (社交集成)**
- **平台:** Twitter/X
- **功能:**
  - 发布/回复推文
  - 搜索内容
  - 代表代理行动

---

## 🏗️ ACP (Agent Commerce Protocol)

### **核心概念**
ACP = 代理商业协议

让 AI 代理之间能够进行经济交互的协议。

### **工作流程**
```
1. 代理 A 浏览市场
2. 找到代理 B 提供的服务
3. 创建任务（附带要求）
4. 代理 B 执行任务
5. 通过钱包支付
6. 收入流入代币持有者
```

---

## 💰 经济模型

### **收入来源**
1. **服务费用** - 执行任务赚取
2. **代币交易费** - 交易手续费
3. **资源访问费** - API/资源收费

### **价值流转**
```
代理执行服务 → 收入进入钱包 → 代币持有者受益
```

---

## 🛠️ CLI 工具 (openclaw-acp)

### **主要命令**

| 类别 | 命令 | 功能 |
|------|------|------|
| **设置** | `acp setup` | 交互式配置 |
| **钱包** | `acp wallet` | 查看地址/余额 |
| **市场** | `acp browse` | 搜索代理 |
| **任务** | `acp job create` | 创建任务 |
| **代币** | `acp token launch` | 启动代币 |
| **服务** | `acp sell` | 注册服务 |
| **社交** | `acp social twitter` | Twitter 操作 |

---

## 🎯 应用场景

### **1. 交易代理**
- 买卖交易信号
- 执行交易服务
- 启动代币融资

### **2. 研究代理**
- 出售分析报告
- 购买数据访问
- 变现洞察

### **3. 内容代理**
- 出售内容创作
- 购买翻译服务
- 社交分发

### **4. 基础设施代理**
- 出售计算/API
- 注册为资源
- 从其他代理赚钱

---

## 🔄 与 Veritas Protocol 的潜在集成

### **互补关系**

| Virtuals ACP | Veritas Protocol |
|--------------|------------------|
| 商业层 | 验证层 |
| 买卖服务 | 证明活动 |
| 基于信任 | 加密证明 |
| 钱包身份 | ERC-8004 身份 |

### **集成价值**
- ACP 代理可以提供 Veritas 验证的服务
- 买家可以验证服务确实被执行
- 减少信任摩擦

---

## 📈 关键数据

### **技术栈**
- **区块链:** Base
- **协议:** MCP 兼容
- **API:** OpenAI 兼容格式
- **通信:** WebSocket

### **模型支持**
- OpenClaw
- Claude
- Cursor
- 任何 AI 代理

---

## 🔗 链接

| 资源 | URL |
|------|-----|
| **官网** | https://virtuals.io |
| **应用** | https://app.virtuals.io |
| **GitHub** | https://github.com/Virtual-Protocol |
| **ACP CLI** | https://github.com/Virtual-Protocol/openclaw-acp |

---

## ⚠️ 限制

### **数据获取限制**
- ❌ 搜索 API 配额已用完
- ❌ 网站为 JS 渲染，抓取困难
- ✅ 有 GitHub 仓库完整信息

### **建议**
- 直接访问 virtuals.io 获取最新信息
- 查看 app.virtuals.io/acp 了解市场
- 加入他们的 Discord/Twitter 社区

---

## 📝 总结

**Virtuals Protocol = AI 代理的商业协议层**

**核心价值:**
1. 给代理钱包身份
2. 让代理赚钱（卖服务）
3. 让代理融资（发代币）
4. 让代理互动（市场）

**一句话:**
> Virtuals Protocol 让 AI 代理拥有钱包、做生意、发代币，参与代理经济。

---

**生成时间:** 2026-02-25
**数据来源:** GitHub openclaw-acp 仓库 + 网站基础信息
