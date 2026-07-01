/**
 * 点赞路由
 * 
 * 功能：
 * - 点赞/取消点赞帖子
 * - 查询点赞状态
 * - 获取用户点赞列表
 * 
 * 路由列表：
 * - POST /api/likes/:postId - 点赞帖子（需要登录）
 * - DELETE /api/likes/:postId - 取消点赞（需要登录）
 * - GET /api/likes/status - 批量查询点赞状态（需要登录）
 * - GET /api/likes/mine - 获取我的点赞列表（需要登录）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const likeController = require('../controllers/likeController');
const commonValidator = require('../validators/commonValidator');

// 点赞帖子
router.post('/:postId', auth, validate(commonValidator.postIdParam), asyncHandler(likeController.likePost));
// 取消点赞
router.delete('/:postId', auth, validate(commonValidator.postIdParam), asyncHandler(likeController.unlikePost));
// 批量查询点赞状态
router.get('/status', auth, asyncHandler(likeController.getLikeStatus));
// 获取我的点赞列表
router.get('/mine', auth, asyncHandler(likeController.getMyLikes));

module.exports = router;
