/**
 * 关注验证器
 * 
 * 功能：
 * - 验证关注相关请求参数
 * 
 * 验证规则：
 * - userIdParam: 用户 ID 参数（MongoDB ID）
 */

const { param } = require('express-validator');

// 用户 ID 参数验证
exports.userIdParam = [
  param('userId').isMongoId().withMessage('无效的用户ID'),
];
