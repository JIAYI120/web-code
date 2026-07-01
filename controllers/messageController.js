/**
 * 消息控制器
 * 
 * 功能：
 * - 会话管理（创建、查询、删除）
 * - 消息发送和查询
 * - 通知管理
 * 
 * API 接口：
 * - GET /api/messages/conversations - 获取会话列表
 * - GET /api/messages/conversation-detail/:userId - 获取会话详情
 * - GET /api/messages/history/:userId - 获取聊天记录
 * - GET /api/messages/search/:userId - 搜索消息
 * - PATCH /api/messages/conversations/:id/pin - 置顶会话
 * - PATCH /api/messages/conversations/:id/mute - 静音会话
 * - DELETE /api/messages/conversations/:id - 删除会话
 * - GET /api/messages/summary - 获取消息摘要
 * - GET /api/messages/notifications - 获取通知列表
 * - PATCH /api/messages/notifications/read-all - 标记所有通知已读
 * - DELETE /api/messages/notifications/:id - 删除通知
 * - POST /api/messages/:userId - 发送消息
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const InteractionNotification = require('../models/InteractionNotification');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { success, fail, error } = require('../utils/response');
const { getProfileMap } = require('../utils/userHelper');
const { formatMessageTime } = require('../utils/timeHelper');
const { parsePagination, paginationResult } = require('../utils/pagination');
const cache = require('../utils/cache');
const { logger } = require('../utils/logger');

/**
 * 验证 ObjectId 是否有效
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * 获取用户删除会话的时间点
 */
function getUserDeleteCutoff(conversation, userId) {
  const snapshot = conversation.deletedSnapshots?.get?.(userId);
  return snapshot ? new Date(snapshot) : null;
}

/**
 * 获取物理清理边界
 */
function getPhysicalClearBoundary(conversation) {
  const snapshotValues = Object.values(conversation.deletedSnapshots?.toObject?.() || {});
  if (!snapshotValues.length) return null;
  const validDates = snapshotValues.map(v => new Date(v)).filter(v => !Number.isNaN(v.getTime()));
  if (!validDates.length) return null;
  return new Date(Math.min(...validDates.map(v => v.getTime())));
}

/**
 * 清理双方都删除的消息
 */
async function cleanupSharedDeletedMessages(conversation) {
  const boundary = getPhysicalClearBoundary(conversation);
  if (!boundary) return false;
  const lastClearedAt = conversation.lastClearedAt ? new Date(conversation.lastClearedAt) : null;
  if (lastClearedAt && boundary.getTime() <= lastClearedAt.getTime()) return false;
  const deleteQuery = { conversation: conversation._id, createdAt: { $lte: boundary } };
  if (lastClearedAt) deleteQuery.createdAt.$gt = lastClearedAt;
  await Message.deleteMany(deleteQuery);
  conversation.lastClearedAt = boundary;
  const remainingCount = await Message.countDocuments({ conversation: conversation._id });
  if (remainingCount === 0) {
    await conversation.deleteOne();
    return true;
  }
  const latestMessage = await Message.findOne({ conversation: conversation._id }).sort({ createdAt: -1 });
  conversation.lastMessage = latestMessage?.content || '';
  conversation.lastMessageAt = latestMessage?.createdAt || conversation.updatedAt;
  await conversation.save();
  return false;
}

/**
 * 获取或创建会话
 */
async function getOrCreateConversation(userA, userB) {
  const participants = [userA, userB].sort();
  let conversation = await Conversation.findOne({ participants });
  if (!conversation) {
    conversation = new Conversation({ participants });
    await conversation.save();
  }
  return conversation;
}

/**
 * 获取通知描述
 */
function getNotificationDesc(item) {
  if (item.type === 'like') return '赞了你的帖子';
  if (item.type === 'comment') return item.content ? '评论了你：' + item.content : '评论了你的帖子';
  if (item.type === 'bookmark') return '收藏了你的帖子';
  if (item.type === 'follow') return '关注了你';
  return '与你产生了互动';
}

/**
 * 获取会话列表
 */
exports.getConversations = async (req, res) => {
  try {
    const myId = req.user.id;
    const cacheKey = 'conversations:' + myId;
    let result = cache.get(cacheKey);
    if (!result) {
      const conversations = await Conversation.find({ participants: myId }).sort({ lastMessageAt: -1 });
      const visibleConversations = conversations.filter(
        item => !(item.deletedBy || []).some(id => id.toString() === myId)
      );
      const otherUserIds = visibleConversations
        .map(item => item.participants.find(id => id.toString() !== myId)?.toString())
        .filter(Boolean);
      const [users, profileMap] = await Promise.all([
        otherUserIds.length ? User.find({ _id: { $in: otherUserIds } }).select('name') : [],
        getProfileMap(otherUserIds),
      ]);
      const userMap = users.reduce((map, item) => {
        map[item._id.toString()] = item;
        return map;
      }, {});
      const visibleConversationIds = visibleConversations.map(item => item._id);
      const unreadCounts = await Message.aggregate([
        {
          $match: {
            receiver: new mongoose.Types.ObjectId(myId),
            isRead: false,
            conversation: { $in: visibleConversationIds },
          },
        },
        { $group: { _id: '$conversation', count: { $sum: 1 } } },
      ]);
      const unreadMap = unreadCounts.reduce((map, item) => {
        map[item._id.toString()] = item.count;
        return map;
      }, {});
      result = visibleConversations.map(item => {
        const otherUserId = item.participants.find(id => id.toString() !== myId)?.toString();
        const user = userMap[otherUserId];
        const profile = profileMap[otherUserId];
        const nickname = profile?.nickname || user?.name || '校园用户';
        const isMuted = (item.mutedBy || []).some(id => id.toString() === myId);
        return {
          id: item._id,
          userId: otherUserId,
          nickname,
          avatarText: nickname.charAt(0).toUpperCase(),
          lastMessage: item.lastMessage || '开始和 Ta 聊天吧',
          time: formatMessageTime(item.lastMessageAt || item.updatedAt),
          unreadCount: unreadMap[item._id.toString()] || 0,
          isPinned: (item.pinnedBy || []).some(id => id.toString() === myId),
          isMuted,
          updatedAt: item.lastMessageAt || item.updatedAt,
        };
      });
      result.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      cache.set(cacheKey, result, 5000);
    }
    success(res, result);
  } catch (err) {
    logger.error('[messageController.getConversations]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取会话详情
 */
exports.getConversationDetail = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;
    if (!isValidObjectId(otherUserId)) return fail(res, '无效的用户ID');
    const user = await User.findById(otherUserId).select('name');
    if (!user) return fail(res, '用户不存在', 1, 404);
    const [profile, conversation] = await Promise.all([
      Profile.findOne({ user: otherUserId }),
      getOrCreateConversation(myId, otherUserId),
    ]);
    const nickname = profile?.nickname || user.name || '校园用户';
    const deleteCutoff = getUserDeleteCutoff(conversation, myId);
    success(res, {
      conversationId: conversation._id,
      user: { _id: otherUserId, nickname },
      isPinned: (conversation.pinnedBy || []).some(id => id.toString() === myId),
      isMuted: (conversation.mutedBy || []).some(id => id.toString() === myId),
      deleteCutoff,
    });
  } catch (err) {
    logger.error('[messageController.getConversationDetail]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取聊天记录
 */
exports.getHistory = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;
    if (!isValidObjectId(otherUserId)) return fail(res, '无效的用户ID');
    const user = await User.findById(otherUserId).select('name');
    if (!user) return fail(res, '用户不存在', 1, 404);
    const [profile, conversation] = await Promise.all([
      Profile.findOne({ user: otherUserId }),
      getOrCreateConversation(myId, otherUserId),
    ]);
    const deleteCutoff = getUserDeleteCutoff(conversation, myId);
    const messageQuery = { conversation: conversation._id };
    if (deleteCutoff) messageQuery.createdAt = { $gt: deleteCutoff };
    const messages = await Message.find(messageQuery).sort({ createdAt: 1 });
    await Message.updateMany(
      { conversation: conversation._id, receiver: myId, isRead: false, ...(deleteCutoff ? { createdAt: { $gt: deleteCutoff } } : {}) },
      { $set: { isRead: true } }
    );
    const nickname = profile?.nickname || user.name || '校园用户';
    success(res, {
      conversationId: conversation._id,
      user: { _id: otherUserId, nickname },
      partner: {
        userId: otherUserId,
        nickname,
        avatarText: nickname.charAt(0).toUpperCase(),
      },
      messages: messages.map(item => ({
        _id: item._id,
        senderId: item.sender,
        receiverId: item.receiver,
        content: item.content,
        isSelf: item.sender.toString() === myId,
        createdAt: item.createdAt,
        createdAtLabel: formatMessageTime(item.createdAt),
      })),
    });
  } catch (err) {
    logger.error('[messageController.getHistory]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 搜索消息
 */
exports.searchMessages = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;
    const keyword = (req.query.keyword || '').trim();
    if (!isValidObjectId(otherUserId)) return fail(res, '无效的用户ID');
    if (!keyword) return success(res, { list: [] });
    const conversation = await getOrCreateConversation(myId, otherUserId);
    const deleteCutoff = getUserDeleteCutoff(conversation, myId);
    const query = {
      conversation: conversation._id,
      content: { $regex: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    };
    if (deleteCutoff) query.createdAt = { $gt: deleteCutoff };
    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(100);
    success(res, {
      list: messages.map(item => ({
        _id: item._id,
        senderId: item.sender,
        receiverId: item.receiver,
        content: item.content,
        isSelf: item.sender.toString() === myId,
        createdAt: item.createdAt,
        createdAtLabel: formatMessageTime(item.createdAt),
      })),
    });
  } catch (err) {
    logger.error('[messageController.searchMessages]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 置顶会话
 */
exports.pinConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return fail(res, '会话不存在', 1, 404);
    const myId = req.user.id;
    if (!conversation.participants.some(id => id.toString() === myId)) return fail(res, '无权操作', 1, 403);
    const pinnedBy = (conversation.pinnedBy || []).map(id => id.toString());
    const isPinned = pinnedBy.includes(myId);
    if (isPinned) {
      conversation.pinnedBy = conversation.pinnedBy.filter(id => id.toString() !== myId);
    } else {
      conversation.pinnedBy = [...(conversation.pinnedBy || []), myId];
    }
    await conversation.save();
    success(res, { isPinned: !isPinned });
  } catch (err) {
    logger.error('[messageController.pinConversation]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 静音会话
 */
exports.muteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return fail(res, '会话不存在', 1, 404);
    const myId = req.user.id;
    if (!conversation.participants.some(id => id.toString() === myId)) return fail(res, '无权操作', 1, 403);
    const mutedBy = (conversation.mutedBy || []).map(id => id.toString());
    const isMuted = mutedBy.includes(myId);
    if (isMuted) {
      conversation.mutedBy = conversation.mutedBy.filter(id => id.toString() !== myId);
    } else {
      conversation.mutedBy = [...(conversation.mutedBy || []), myId];
    }
    await conversation.save();
    success(res, { isMuted: !isMuted });
  } catch (err) {
    logger.error('[messageController.muteConversation]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 删除会话
 */
exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return fail(res, '会话不存在', 1, 404);
    const myId = req.user.id;
    if (!conversation.participants.some(id => id.toString() === myId)) return fail(res, '无权操作', 1, 403);
    const deleteTime = new Date();
    const deletedBy = [...new Set([...(conversation.deletedBy || []).map(id => id.toString()), myId])];
    conversation.deletedBy = deletedBy;
    conversation.pinnedBy = (conversation.pinnedBy || []).filter(id => id.toString() !== myId);
    conversation.mutedBy = (conversation.mutedBy || []).filter(id => id.toString() !== myId);
    if (!conversation.deletedSnapshots) conversation.deletedSnapshots = new Map();
    conversation.deletedSnapshots.set(myId, deleteTime);
    const fullyDeleted = await cleanupSharedDeletedMessages(conversation);
    if (fullyDeleted) {
      return success(res, { fullyDeleted: true }, '聊天记录已彻底删除');
    }
    await conversation.save();
    success(res, { fullyDeleted: false }, '聊天已从当前账号隐藏');
  } catch (err) {
    logger.error('[messageController.deleteConversation]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取消息摘要（未读数）
 */
exports.getSummary = async (req, res) => {
  try {
    const myId = req.user.id;
    const cacheKey = 'summary:' + myId;
    let result = cache.get(cacheKey);
    if (!result) {
      const visibleConversations = await Conversation.find({ participants: myId, deletedBy: { $ne: myId } }).select('_id mutedBy');
      const activeConversationIds = visibleConversations
        .filter(item => !(item.mutedBy || []).some(id => id.toString() === myId))
        .map(item => item._id);
      const [dmUnreadCount, interactionUnreadCount] = await Promise.all([
        Message.countDocuments({
          receiver: myId,
          isRead: false,
          conversation: { $in: activeConversationIds },
        }),
        InteractionNotification.countDocuments({ recipient: myId, isRead: false }),
      ]);
      result = { dmUnreadCount, interactionUnreadCount };
      cache.set(cacheKey, result, 5000);
    }
    success(res, result);
  } catch (err) {
    logger.error('[messageController.getSummary]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取通知列表
 */
exports.getNotifications = async (req, res) => {
  try {
    const myId = req.user.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      InteractionNotification.find({ recipient: myId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      InteractionNotification.countDocuments({ recipient: myId }),
    ]);
    const actorIds = notifications.map(item => item.actor.toString());
    const [users, profileMap] = await Promise.all([
      actorIds.length ? User.find({ _id: { $in: [...new Set(actorIds)] } }).select('name') : [],
      getProfileMap(actorIds),
    ]);
    const userMap = users.reduce((map, item) => {
      map[item._id.toString()] = item;
      return map;
    }, {});
    const notices = notifications.map(item => {
      const actorId = item.actor.toString();
      const user = userMap[actorId];
      const profile = profileMap[actorId];
      const nickname = profile?.nickname || user?.name || '校园用户';
      return {
        id: item._id,
        type: item.type,
        actorId,
        postId: item.post?.toString(),
        commentId: item.comment?.toString(),
        title: nickname,
        avatarText: nickname.charAt(0).toUpperCase(),
        desc: getNotificationDesc(item),
        time: formatMessageTime(item.createdAt),
        isRead: item.isRead,
        createdAt: item.createdAt,
      };
    });
    success(res, {
      list: notices,
      pagination: { page, limit, total, hasMore: skip + notices.length < total },
    });
  } catch (err) {
    logger.error('[messageController.getNotifications]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 标记所有通知已读
 */
exports.markAllNotificationsRead = async (req, res) => {
  try {
    await InteractionNotification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    success(res, null, '已全部标记为已读');
  } catch (err) {
    logger.error('[messageController.markAllNotificationsRead]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 删除通知
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await InteractionNotification.findOne({ _id: req.params.id, recipient: req.user.id });
    if (!notification) return fail(res, '通知不存在', 1, 404);
    if (notification.type === 'comment' && notification.comment) {
      const comment = await Comment.findById(notification.comment);
      if (comment) {
        const post = await Post.findById(comment.post).select('user commentCount');
        const canDeleteComment = comment.user.toString() === req.user.id || post?.user?.toString() === req.user.id;
        if (canDeleteComment) {
          await comment.deleteOne();
          if (post) {
            post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
            await post.save();
          }
          await InteractionNotification.deleteMany({ comment: comment._id });
        }
      }
    }
    await notification.deleteOne();
    success(res, null, '已删除通知');
  } catch (err) {
    logger.error('[messageController.deleteNotification]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 发送消息
 */
exports.sendMessage = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;
    const { content } = req.body;
    if (!isValidObjectId(otherUserId)) return fail(res, '无效的用户ID');
    if (myId === otherUserId) return fail(res, '不能给自己发私信');
    const user = await User.findById(otherUserId);
    if (!user) return fail(res, '用户不存在', 1, 404);
    const conversation = await getOrCreateConversation(myId, otherUserId);
    const message = new Message({
      conversation: conversation._id,
      sender: myId,
      receiver: otherUserId,
      content: content.trim(),
      isRead: false,
    });
    await message.save();
    conversation.lastMessage = message.content;
    conversation.lastMessageAt = message.createdAt;
    conversation.deletedBy = (conversation.deletedBy || []).filter(id => id.toString() !== myId && id.toString() !== otherUserId);
    await conversation.save();
    cache.invalidatePattern('^conversations:' + myId);
    cache.invalidatePattern('^conversations:' + otherUserId);
    success(res, {
      _id: message._id,
      senderId: message.sender,
      receiverId: message.receiver,
      content: message.content,
      isSelf: true,
      createdAt: message.createdAt,
      createdAtLabel: formatMessageTime(message.createdAt),
    });
  } catch (err) {
    logger.error('[messageController.sendMessage]', { error: err.message, stack: err.stack });
    error(res);
  }
};
