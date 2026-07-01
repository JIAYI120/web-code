/**
 * AI 路由
 * 
 * 功能：
 * - AI 聊天接口
 * - 情绪分析接口
 * 
 * 路由列表：
 * - POST /api/ai/chat - AI 聊天（需要登录，内容审核）
 * - POST /api/ai/analyze-mood - 情绪分析（需要登录）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { validateAIMessages } = require('../middleware/contentFilter');
const aiController = require('../controllers/aiController');
const aiValidator = require('../validators/aiValidator');

// AI 聊天
router.post('/chat', auth, validate(aiValidator.chat), validateAIMessages, asyncHandler(aiController.chat));

// 情绪分析
router.post('/analyze-mood', auth, validate(aiValidator.analyzeMood), asyncHandler(aiController.analyzeMood));

module.exports = router;
