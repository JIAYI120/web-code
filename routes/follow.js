/**
 * 关注路由
 * 
 * 功能：
 * - 关注/取消关注用户
 * - 获取关注列表和粉丝列表
 * - 获取关注统计数据
 * 
 * 路由列表：
 * - GET /api/follow/count - 获取关注和粉丝数量（需要登录）
 * - GET /api/follow/following - 获取关注列表（需要登录）
 * - GET /api/follow/fans - 获取粉丝列表（需要登录）
 * - POST /api/follow/:userId - 关注用户（需要登录）
 * - DELETE /api/follow/:userId - 取消关注（需要登录）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const followController = require('../controllers/followController');
const followValidator = require('../validators/followValidator');

// 获取关注和粉丝数量
router.get('/count', auth, asyncHandler(followController.getCount));
// 获取关注列表
router.get('/following', auth, asyncHandler(followController.getFollowing));
// 获取粉丝列表
router.get('/fans', auth, asyncHandler(followController.getFans));
// 关注用户
router.post('/:userId', auth, validate(followValidator.userIdParam), asyncHandler(followController.followUser));
// 取消关注
router.delete('/:userId', auth, validate(followValidator.userIdParam), asyncHandler(followController.unfollowUser));

module.exports = router;
