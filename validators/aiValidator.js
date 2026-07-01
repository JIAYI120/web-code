/**
 * AI 验证器
 * 
 * 功能：
 * - 验证 AI 聊天请求参数
 * - 验证情绪分析请求参数
 * 
 * 验证规则：
 * - messages: 消息数组，1-50 条
 * - role: 消息角色（user/assistant/system）
 * - content: 消息内容，最长 4000 字符
 */

const { body } = require('express-validator');

// AI 聊天验证规则
exports.chat = [
  body('messages')
    .isArray({ min: 1, max: 50 }).withMessage('消息数量需在1-50之间'),
  body('messages.*.role')
    .isIn(['user', 'assistant', 'system']).withMessage('消息角色格式不正确'),
  body('messages.*.content')
    .trim()
    .notEmpty().withMessage('消息内容不能为空')
    .isLength({ max: 4000 }).withMessage('单条消息最长4000个字符'),
];

// 情绪分析验证规则
exports.analyzeMood = [
  body('content')
    .trim()
    .notEmpty().withMessage('内容不能为空')
    .isLength({ max: 2000 }).withMessage('内容最长2000个字符'),
];
