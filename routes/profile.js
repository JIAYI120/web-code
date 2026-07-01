/**
 * 个人资料路由
 * 
 * 功能：
 * - 获取当前用户的个人资料
 * - 更新个人资料
 * 
 * 路由列表：
 * - GET /api/profile - 获取个人资料（需要登录）
 * - PUT /api/profile - 更新个人资料（需要登录）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const profileController = require('../controllers/profileController');
const userValidator = require('../validators/userValidator');

// 获取个人资料
router.get('/', auth, asyncHandler(profileController.getProfile));
// 更新个人资料
router.put('/', auth, validate(userValidator.updateProfile), asyncHandler(profileController.updateProfile));

module.exports = router;
