/**
 * 用户路由
 * 
 * 功能：
 * - 用户注册和登录
 * - 用户信息查询
 * - 用户搜索
 * - 个人资料更新
 * 
 * 路由列表：
 * - POST /api/users/register - 用户注册（内容审核）
 * - POST /api/users/login - 用户登录
 * - GET /api/users/me - 获取当前用户信息（需要登录）
 * - GET /api/users/search - 搜索用户（需要登录）
 * - PUT /api/users/profile - 更新用户资料（需要登录，内容审核）
 * - GET /api/users/:id/profile - 获取指定用户资料（需要登录）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { validateContent } = require('../middleware/contentFilter');
const userController = require('../controllers/userController');
const userValidator = require('../validators/userValidator');

// 用户注册
router.post('/register', validateContent, validate(userValidator.register), asyncHandler(userController.register));
// 用户登录
router.post('/login', validate(userValidator.login), asyncHandler(userController.login));
// 获取当前用户信息
router.get('/me', auth, asyncHandler(userController.getMe));
// 搜索用户
router.get('/search', auth, validate(userValidator.search), asyncHandler(userController.search));
// 更新用户资料
router.put('/profile', auth, validateContent, validate(userValidator.updateProfile), asyncHandler(userController.updateProfile));
// 获取指定用户资料
router.get('/:id/profile', auth, validate(userValidator.userIdParam), asyncHandler(userController.getUserProfile));

module.exports = router;
