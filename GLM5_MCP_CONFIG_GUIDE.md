# GLM-5 MCP 配置指南

## 什么是 MCP？

**MCP (Model Context Protocol)** 是一个协议，允许 AI 模型作为服务器运行，为其他应用提供服务。

---

## 方案 1: 使用 OpenClaw 内置 GLM-5（推荐）

### 当前配置（已经可用）

您的 OpenClaw 已经配置了 GLM-5：

```json
// ~/.openclaw/openclaw.json
{
  "models": {
    "providers": {
      "zai": {
        "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4",
        "api": "openai-completions",
        "models": [
          {
            "id": "glm-5",
            "name": "GLM-5",
            "reasoning": true,
            "contextWindow": 204800,
            "maxTokens": 131072
          }
        ]
      }
    }
  }
}
```

### 使用方式

```bash
# 直接使用 GLM-5
openclaw chat --model glm-5

# 或在代码中指定
const response = await agent.chat("你好", { model: "zai/glm-5" });
```

---

## 方案 2: 配置 GLM-5 MCP 服务器

### 步骤 1: 安装 MCP SDK

```bash
# 安装 Node.js MCP SDK
npm install -g @anthropic-ai/mcp-server

# 或使用 Python SDK
pip install anthropic-mcp
```

### 步骤 2: 创建 GLM-5 MCP 服务器

创建文件 `~/.openclaw/mcp-servers/glm5-server.js`:

```javascript
const { MCPServer } = require('@anthropic-ai/mcp-server');
const axios = require('axios');

class GLM5MCPServer extends MCPServer {
  constructor() {
    super({
      name: 'glm-5-server',
      version: '1.0.0',
    });

    this.apiKey = process.env.ZHIPUAI_API_KEY;
    this.baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
  }

  // 注册工具
  async setupTools() {
    // 聊天工具
    this.registerTool({
      name: 'chat',
      description: '使用 GLM-5 进行对话',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '用户消息' },
          temperature: { type: 'number', description: '温度参数 (0-1)' },
          max_tokens: { type: 'number', description: '最大 token 数' }
        },
        required: ['message']
      },
      handler: async (params) => {
        return await this.chat(params.message, params);
      }
    });

    // Embedding 工具
    this.registerTool({
      name: 'embed',
      description: '使用 GLM-5 生成文本嵌入',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '要嵌入的文本' }
        },
        required: ['text']
      },
      handler: async (params) => {
        return await this.embed(params.text);
      }
    });
  }

  // GLM-5 API 调用
  async chat(message, options = {}) {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: 'glm-5',
        messages: [{ role: 'user', content: message }],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2048
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  // Embedding API 调用
  async embed(text) {
    const response = await axios.post(
      `${this.baseUrl}/embeddings`,
      {
        model: 'glm-5',
        input: text
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.data[0].embedding;
  }
}

// 启动服务器
const server = new GLM5MCPServer();
server.start();
```

### 步骤 3: 配置环境变量

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export ZHIPUAI_API_KEY="your_api_key_here"
```

### 步骤 4: 在 OpenClaw 中注册 MCP 服务器

编辑 `~/.openclaw/openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "glm-5": {
        "command": "node",
        "args": ["/home/xiang/.openclaw/mcp-servers/glm5-server.js"],
        "env": {
          "ZHIPUAI_API_KEY": "your_api_key_here"
        }
      }
    }
  }
}
```

---

## 方案 3: 使用 Anthropic MCP 客户端

### 步骤 1: 安装客户端

```bash
npm install -g @anthropic-ai/claude-cli
```

### 步骤 2: 配置 GLM-5

创建 `~/.claude/config.json`:

```json
{
  "model": "glm-5",
  "apiBaseUrl": "https://open.bigmodel.cn/api/paas/v4",
  "apiKey": "${ZHIPUAI_API_KEY}"
}
```

### 步骤 3: 启动 MCP 服务器

```bash
# 启动 GLM-5 MCP 服务器
claude mcp start glm-5

# 使用
claude chat --mcp glm-5
```

---

## 方案 4: 使用 Python MCP SDK

### 步骤 1: 安装 SDK

```bash
pip install anthropic-mcp zhipuai
```

### 步骤 2: 创建服务器

创建文件 `~/.openclaw/mcp-servers/glm5_server.py`:

```python
from anthropic_mcp import MCPServer
from zhipuai import ZhipuAI
import os

class GLM5Server(MCPServer):
    def __init__(self):
        super().__init__(name="glm-5-server", version="1.0.0")
        self.client = ZhipuAI(api_key=os.getenv("ZHIPUAI_API_KEY"))

    @MCPServer.tool("chat")
    async def chat(self, message: str, temperature: float = 0.7):
        """使用 GLM-5 进行对话"""
        response = self.client.chat.completions.create(
            model="glm-5",
            messages=[{"role": "user", "content": message}],
            temperature=temperature
        )
        return response.choices[0].message.content

    @MCPServer.tool("embed")
    async def embed(self, text: str):
        """使用 GLM-5 生成文本嵌入"""
        response = self.client.embeddings.create(
            model="glm-5",
            input=text
        )
        return response.data[0].embedding

if __name__ == "__main__":
    server = GLM5Server()
    server.start()
```

### 步骤 3: 运行

```bash
export ZHIPUAI_API_KEY="your_key"
python ~/.openclaw/mcp-servers/glm5_server.py
```

---

## 常见问题

### Q: MCP 和普通 API 有什么区别？

**普通 API:**
- 单向调用
- 无状态
- 每次都需要认证

**MCP:**
- 双向通信
- 有状态
- 持久连接
- 工具注册
- 资源共享

### Q: 为什么需要 MCP？

如果你想让 GLM-5：
- 作为独立服务运行
- 被多个应用共享
- 提供标准化的工具接口
- 支持双向通信

就需要配置 MCP。

### Q: 获取 API Key

1. 访问 https://open.bigmodel.cn
2. 注册/登录
3. 进入控制台
4. 创建 API Key
5. 复制保存

### Q: 测试配置

```bash
# 测试 API 连接
curl https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Authorization: Bearer $ZHIPUAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-5","messages":[{"role":"user","content":"你好"}]}'
```

---

## 推荐方案

### 如果您只想使用 GLM-5:
✅ **方案 1** - OpenClaw 内置（已配置）

### 如果您需要 MCP 服务器:
✅ **方案 2** - Node.js MCP 服务器

### 如果您喜欢 Python:
✅ **方案 4** - Python MCP 服务器

---

## 下一步

1. **选择方案** - 根据需求选择
2. **获取 API Key** - 从智谱 AI 获取
3. **配置环境变量** - 设置 ZHIPUAI_API_KEY
4. **创建服务器** - 按步骤创建
5. **测试** - 验证配置正确

---

## 参考链接

- **智谱 AI 开放平台:** https://open.bigmodel.cn
- **MCP 协议文档:** https://modelcontextprotocol.io
- **OpenClaw 文档:** https://docs.openclaw.ai
- **Anthropic MCP SDK:** https://github.com/anthropics/anthropic-mcp

---

**需要帮助？** 告诉我您想用 GLM-5 MCP 做什么，我可以提供更具体的配置！
