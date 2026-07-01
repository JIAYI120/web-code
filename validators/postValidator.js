/**
 * 帖子验证器
 * 
 * 功能：
 * - 验证帖子相关请求参数
 * 
 * 验证规则：
 * - createPost: 创建帖子
 *   - content: 帖子内容，最长 5000 字符
 *   - topic: 话题标签（可选，最长 30 字符）
 *   - images: 图片列表（可选，URL 数组）
 *   - draftId: 草稿 ID（可选）
 * - updateDraft: 更新草稿
 *   - content: 草稿内容（可选，最长 5000 字符）
 *   - topic: 话题标签（可选，最长 30 字符）
 *   - images: 图片列表（可选）
 * - createDraft: 创建草稿
 *   - content: 草稿内容（可选，最长 5000 字符）
 *   - topic: 话题标签（可选，最长 30 字符）
 *   - images: 图片列表（可选）
 * - search: 搜索帖子
 *   - q: 搜索关键词（可选，最长 50 字符）
 * - postIdParam: 帖子 ID 参数（MongoDB ID）
 * - userIdParam: 用户 ID 参数（MongoDB ID）
 */

const { body, query, param } = require('express-validator');

// 创建帖子验证规则
exports.createPost = [
  body('content')
    .trim()
    .notEmpty().withMessage('帖子内容不能为空')
    .isLength({ max: 5000 }).withMessage('帖子内容最长5000个字符'),
  body('topic').optional().trim().isLength({ max: 30 }).withMessage('话题最长30个字符'),
  body('images').optional().isArray().withMessage('图片格式不正确'),
  body('images.*').optional().isURL().withMessage('图片链接格式不正确'),
  body('draftId').optional().trim(),
];

// 更新草稿验证规则
exports.updateDraft = [
  body('content').optional().trim().isLength({ max: 5000 }).withMessage('草稿内容最长5000个字符'),
  body('topic').optional().trim().isLength({ max: 30 }).withMessage('话题最长30个字符'),
  body('images').optional().isArray().withMessage('图片格式不正确'),
];

// 创建草稿验证规则
exports.createDraft = [
  body('content').optional().trim().isLength({ max: 5000 }).withMessage('草稿内容最长5000个字符'),
  body('topic').optional().trim().isLength({ max: 30 }).withMessage('话题最长30个字符'),
  body('images').optional().isArray().withMessage('图片格式不正确'),
];

// 搜索帖子验证规则
exports.search = [
  query('q').optional().trim().isLength({ max: 50 }).withMessage('搜索关键词最长50个字符'),
];

// 帖子 ID 参数验证
exports.postIdParam = [
  param('id').isMongoId().withMessage('无效的帖子ID'),
];

// 用户 ID 参数验证
exports.userIdParam = [
  param('userId').isMongoId().withMessage('无效的用户ID'),
];

// 草稿 ID 参数验证
exports.draftIdParam = [
  param('id').isMongoId().withMessage('无效的草稿ID'),
];
