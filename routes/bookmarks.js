/**
 * 收藏路由
 * 
 * 功能：
 * - 收藏/取消收藏帖子
 * - 查询收藏状态
 * - 获取用户收藏列表
 * 
 * 路由列表：
 * - POST /api/bookmarks/:postId - 收藏帖子（需要登录）
 * - DELETE /api/bookmarks/:postId - 取消收藏（需要登录）
 * - GET /api/bookmarks/status - 批量查询收藏状态（需要登录）
 * - GET /api/bookmarks/mine - 获取我的收藏列表（需要登录）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const bookmarkController = require('../controllers/bookmarkController');
const commonValidator = require('../validators/commonValidator');

// 收藏帖子
router.post('/:postId', auth, validate(commonValidator.postIdParam), asyncHandler(bookmarkController.bookmarkPost));
// 取消收藏
router.delete('/:postId', auth, validate(commonValidator.postIdParam), asyncHandler(bookmarkController.unbookmarkPost));
// 批量查询收藏状态
router.get('/status', auth, asyncHandler(bookmarkController.getBookmarkStatus));
// 获取我的收藏列表
router.get('/mine', auth, asyncHandler(bookmarkController.getMyBookmarks));

module.exports = router;
