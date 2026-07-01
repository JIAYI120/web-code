/**
 * 消息验证器
 * 
 * 功能：
 * - 验证消息相关请求参数
 * 
 * 验证规则：
 * - sendMessage: 发送消息
 *   - userId: 用户 ID（MongoDB ID）
 *   - content: 消息内容，最长 2000 字符
 * - conversationIdParam: 会话 ID 参数（MongoDB ID）
 * - userIdParam: 用户 ID 参数（MongoDB ID）
 * - searchKeyword: 搜索关键词
 *   - userId: 用户 ID（MongoDB ID）
 *   - keyword: 搜索关键词（可选，最长 100 字符）
 */

const { body, param, query } = require('express-validator');

// 发送消息验证规则
exports.sendMessage = [
  param('userId').isMongoId().withMessage('无效的用户ID'),
  body('content')
    .trim()
    .notEmpty().withMessage('私信内容不能为空')
    .isLength({ max: 2000 }).withMessage('私信最长2000个字符'),
];

// 会话 ID 参数验证
exports.conversationIdParam = [
  param('id').isMongoId().withMessage('无效的会话ID'),
];

// 用户 ID 参数验证
exports.userIdParam = [
  param('userId').isMongoId().withMessage('无效的用户ID'),
];

// 搜索关键词验证规则
exports.searchKeyword = [
  param('userId').isMongoId().withMessage('无效的用户ID'),
  query('keyword').optional().trim().isLength({ max: 100 }).withMessage('搜索关键词最长100个字符'),
];

// 通知 ID 参数验证
exports.notificationIdParam = [
  param('id').isMongoId().withMessage('无效的通知ID'),
];
