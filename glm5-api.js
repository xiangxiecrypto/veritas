/**
 * GLM-5 API 调用工具
 */

const ZHIPUAI_API_KEY = process.env.ZHIPUAI_API_KEY || "0d3d31b5028a4f9faa0b0d814296e553.4GUOzDGkqKSJL1Bw";
const ZHIPUAI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

/**
 * 调用 GLM-5 进行对话
 * @param {string} message - 用户消息
 * @param {object} options - 可选参数
 * @returns {Promise<string>} GLM-5 的回复
 */
async function chat(message, options = {}) {
  const response = await fetch(`${ZHIPUAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ZHIPUAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'glm-5',
      messages: [{ role: 'user', content: message }],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2048,
      ...options
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GLM-5 API Error: ${data.error.message}`);
  }

  return {
    content: data.choices[0].message.content,
    reasoning: data.choices[0].message.reasoning_content,
    usage: data.usage,
    model: data.model
  };
}

/**
 * 批量对话
 * @param {Array<{role: string, content: string}>} messages - 消息列表
 * @param {object} options - 可选参数
 */
async function chatMultiple(messages, options = {}) {
  const response = await fetch(`${ZHIPUAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ZHIPUAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'glm-5',
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2048,
      ...options
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GLM-5 API Error: ${data.error.message}`);
  }

  return {
    content: data.choices[0].message.content,
    reasoning: data.choices[0].message.reasoning_content,
    usage: data.usage,
    model: data.model
  };
}

/**
 * 获取文本嵌入
 * @param {string} text - 要嵌入的文本
 */
async function embed(text) {
  const response = await fetch(`${ZHIPUAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ZHIPUAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'glm-5',
      input: text
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GLM-5 API Error: ${data.error.message}`);
  }

  return {
    embedding: data.data[0].embedding,
    model: data.model,
    usage: data.usage
  };
}

module.exports = {
  chat,
  chatMultiple,
  embed,
  ZHIPUAI_API_KEY,
  ZHIPUAI_BASE_URL
};
