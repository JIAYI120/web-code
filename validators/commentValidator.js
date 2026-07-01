/**
 * 评论验证器
 * 
 * 功能：
 * - 验证评论相关请求参数
 * 
 * 验证规则：
 * - createComment: 创建评论
 *   - postId: 帖子 ID（MongoDB ID）
 *   - content: 评论内容，最长 1000 字符
 *   - parentId: 父评论 ID（可选，MongoDB ID）
 *   - replyToId: 被回复用户 ID（可选，MongoDB ID）
 * - deleteComment: 删除评论
 *   - id: 评论 ID（MongoDB ID）
 * - getReplies: 获取回复列表
 *   - commentId: 评论 ID（MongoDB ID）
 *   - page: 页码（可选，正整数）
 *   - pageSize: 每页数量（可选，1-50）
 */

const { body, param, query } = require('express-validator');

// 创建评论验证规则
exports.createComment = [
  param('postId').isMongoId().withMessage('无效的帖子ID'),
  body('content')
    .trim()
    .notEmpty().withMessage('评论内容不能为空')
    .isLength({ max: 1000 }).withMessage('评论最长1000个字符'),
  body('parentId')
    .optional()
    .isMongoId().withMessage('无效的父评论ID'),
  body('replyToId')
    .optional()
    .isMongoId().withMessage('无效的回复用户ID'),
];

// 删除评论验证规则
exports.deleteComment = [
  param('id').isMongoId().withMessage('无效的评论ID'),
];

// 获取回复列表验证规则
exports.getReplies = [
  param('commentId').isMongoId().withMessage('无效的评论ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须为正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 50 }).withMessage('每页数量为1-50'),
];

// 帖子 ID 参数验证
exports.postIdParam = [
  param('postId').isMongoId().withMessage('无效的帖子ID'),
];
