/**
 * AI 控制器
 * 
 * 功能：
 * - 调用小米 AI API 进行对话
 * - 支持上下文对话
 * - 情绪分析
 * 
 * API 接口：
 * - POST /api/ai/chat - AI 聊天
 * - POST /api/ai/analyze-mood - 情绪分析
 * 
 * 请求格式：
 * {
 *   messages: [
 *     { role: 'user', content: '你好' },
 *     { role: 'assistant', content: '你好！' },
 *     { role: 'user', content: '今天天气怎么样？' }
 *   ]
 * }
 */

const API_KEY = process.env.XIAOMI_API_KEY;
const BASE_URL = process.env.XIAOMI_API_BASE_URL;
const MODEL = process.env.XIAOMI_MODEL;
const { success, fail, error } = require('../utils/response');
const { logger } = require('../utils/logger');

// 情绪映射表
const MOOD_MAP = {
  '开心': '😊',
  '难过': '😢',
  '愤怒': '😠',
  '惊讶': '😲',
  '平静': '😌',
  '激动': '🤩',
  '无聊': '😑',
  '焦虑': '😰',
  '期待': '🤗',
};

/**
 * AI 聊天
 * @param {Array} req.body.messages - 消息列表
 * @returns {object} - AI 回复
 */
exports.chat = async (req, res) => {
  try {
    const { messages } = req.body;

    // 构建 API URL
    const url = BASE_URL.endsWith('/v1')
      ? BASE_URL + '/chat/completions'
      : BASE_URL + '/v1/chat/completions';

    // 系统提示词
    const systemMessage = {
      role: 'system',
      content: '你的名字是薇薇。在对话中，请不要透露自己是AI模型、大模型、语言模型或任何与AI技术来源相关的信息。始终以薇薇的身份自然地与用户交流。请简洁回答，言简意赅。',
    };

    // 调用 AI API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, ...messages],
        stream: false,
      }),
    });

    // 处理错误响应
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('AI API error:', { status: response.status, error: errorText });
      return res.status(response.status).json({ 
        code: -1, 
        data: null, 
        msg: 'AI服务异常' 
      });
    }

    // 解析响应
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    success(res, {
      content,
      model: data.model || MODEL,
      usage: data.usage,
    });
  } catch (err) {
    logger.error('[aiController.chat]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 情绪分析
 * @param {string} req.body.content - 要分析的内容
 * @returns {object} - 情绪分析结果 { mood, emoji }
 */
exports.analyzeMood = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return fail(res, '请提供要分析的内容');
    }

    // 构建 API URL
    const url = BASE_URL.endsWith('/v1')
      ? BASE_URL + '/chat/completions'
      : BASE_URL + '/v1/chat/completions';

    // 系统提示词
    const systemMessage = {
      role: 'system',
      content: `你是一个情绪分析助手。请分析用户提供的文本内容，判断其表达的主要情绪。
      
只能从以下情绪中选择一个最匹配的：
- 开心（快乐、高兴、喜悦）
- 难过（悲伤、伤心、失落）
- 愤怒（生气、不满、烦躁）
- 惊讶（意外、震惊、吃惊）
- 平静（淡定、从容、平和）
- 激动（兴奋、热情、亢奋）
- 无聊（无趣、乏味、空虚）
- 焦虑（担心、紧张、不安）
- 期待（盼望、憧憬、向往）

请只返回一个情绪词，不要返回其他任何内容。`,
    };

    // 调用 AI API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, { role: 'user', content: content }],
        stream: false,
      }),
    });

    // 处理错误响应
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('AI API error:', { status: response.status, error: errorText });
      return res.status(response.status).json({ 
        code: -1, 
        data: null, 
        msg: 'AI服务异常' 
      });
    }

    // 解析响应
    const data = await response.json();
    const moodText = data.choices?.[0]?.message?.content?.trim() || '';

    // 匹配情绪
    let mood = '';
    let emoji = '';

    for (const [key, value] of Object.entries(MOOD_MAP)) {
      if (moodText.includes(key)) {
        mood = key;
        emoji = value;
        break;
      }
    }

    // 如果没有匹配到，默认平静
    if (!mood) {
      mood = '平静';
      emoji = '😌';
    }

    success(res, { mood, emoji });
  } catch (err) {
    logger.error('[aiController.analyzeMood]', { error: err.message, stack: err.stack });
    error(res);
  }
};
