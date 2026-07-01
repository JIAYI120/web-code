/**
 * 消息路由
 * 
 * 功能：
 * - 会话管理（创建、查询、删除）
 * - 消息发送和查询
 * - 通知管理
 * 
 * 路由列表：
 * - GET /api/messages/conversations - 获取会话列表（需要登录）
 * - GET /api/messages/conversation-detail/:userId - 获取会话详情（需要登录）
 * - GET /api/messages/history/:userId - 获取聊天记录（需要登录）
 * - GET /api/messages/search/:userId - 搜索消息（需要登录）
 * - PATCH /api/messages/conversations/:id/pin - 置顶会话（需要登录）
 * - PATCH /api/messages/conversations/:id/mute - 静音会话（需要登录）
 * - DELETE /api/messages/conversations/:id - 删除会话（需要登录）
 * - GET /api/messages/summary - 获取消息摘要（需要登录）
 * - GET /api/messages/notifications - 获取通知列表（需要登录）
 * - PATCH /api/messages/notifications/read-all - 标记所有通知已读（需要登录）
 * - DELETE /api/messages/notifications/:id - 删除通知（需要登录）
 * - POST /api/messages/:userId - 发送消息（需要登录，内容审核）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { validateContent } = require('../middleware/contentFilter');
const messageController = require('../controllers/messageController');
const messageValidator = require('../validators/messageValidator');

// 获取会话列表
router.get('/conversations', auth, asyncHandler(messageController.getConversations));
// 获取会话详情
router.get('/conversation-detail/:userId', auth, validate(messageValidator.userIdParam), asyncHandler(messageController.getConversationDetail));
// 获取聊天记录
router.get('/history/:userId', auth, validate(messageValidator.userIdParam), asyncHandler(messageController.getHistory));
// 搜索消息
router.get('/search/:userId', auth, validate(messageValidator.searchKeyword), asyncHandler(messageController.searchMessages));
// 置顶会话
router.patch('/conversations/:id/pin', auth, validate(messageValidator.conversationIdParam), asyncHandler(messageController.pinConversation));
// 静音会话
router.patch('/conversations/:id/mute', auth, validate(messageValidator.conversationIdParam), asyncHandler(messageController.muteConversation));
// 删除会话
router.delete('/conversations/:id', auth, validate(messageValidator.conversationIdParam), asyncHandler(messageController.deleteConversation));
// 获取消息摘要
router.get('/summary', auth, asyncHandler(messageController.getSummary));
// 获取通知列表
router.get('/notifications', auth, asyncHandler(messageController.getNotifications));
// 标记所有通知已读
router.patch('/notifications/read-all', auth, asyncHandler(messageController.markAllNotificationsRead));
// 删除通知
router.delete('/notifications/:id', auth, validate(messageValidator.notificationIdParam), asyncHandler(messageController.deleteNotification));
// 发送消息
router.post('/:userId', auth, validateContent, validate(messageValidator.sendMessage), asyncHandler(messageController.sendMessage));

module.exports = router;
