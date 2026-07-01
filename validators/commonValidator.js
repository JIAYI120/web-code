/**
 * 通用验证器
 * 
 * 功能：
 * - 验证通用请求参数
 * 
 * 验证规则：
 * - postIdParam: 帖子 ID 参数（MongoDB ID）
 * - postIdsQuery: 帖子 ID 查询参数（逗号分隔的 MongoDB ID 列表）
 */

const { param, query } = require('express-validator');

// 帖子 ID 参数验证
exports.postIdParam = [
  param('postId').isMongoId().withMessage('无效的帖子ID'),
];

// 帖子 ID 查询参数验证
exports.postIdsQuery = [
  query('posts')
    .notEmpty().withMessage('帖子ID不能为空')
    .custom((value) => {
      const ids = Array.isArray(value) ? value : value.split(',');
      return ids.every(id => /^[0-9a-fA-F]{24}$/.test(id));
    }).withMessage('帖子ID格式不正确'),
];
