/**
 * 评论路由
 * 
 * 功能：
 * - 创建评论（支持二级评论）
 * - 获取评论列表
 * - 获取回复列表
 * - 删除评论
 * 
 * 路由列表：
 * - POST /api/comments/:postId - 创建评论（需要登录，内容审核）
 * - GET /api/comments/:postId - 获取评论列表（需要登录）
 * - GET /api/comments/:commentId/replies - 获取回复列表（需要登录）
 * - DELETE /api/comments/:id - 删除评论（需要登录）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { validateContent } = require('../middleware/contentFilter');
const commentController = require('../controllers/commentController');
const commentValidator = require('../validators/commentValidator');

// 创建评论
router.post('/:postId', auth, validateContent, validate(commentValidator.createComment), asyncHandler(commentController.createComment));
// 获取评论列表
router.get('/:postId', auth, validate(commentValidator.postIdParam), asyncHandler(commentController.getComments));
// 获取回复列表
router.get('/:commentId/replies', auth, validate(commentValidator.getReplies), asyncHandler(commentController.getReplies));
// 删除评论
router.delete('/:id', auth, validate(commentValidator.deleteComment), asyncHandler(commentController.deleteComment));

module.exports = router;
