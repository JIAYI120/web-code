/**
 * 会话模型
 * 
 * 字段说明：
 * - participants: 参与者 ID 列表（2个用户）
 * - lastMessage: 最后一条消息内容
 * - lastMessageAt: 最后消息时间
 * - pinnedBy: 置顶用户列表
 * - mutedBy: 静音用户列表
 * - deletedBy: 删除会话的用户列表
 * - deletedSnapshots: 用户删除时间快照
 * - lastClearedAt: 最后清理时间
 * 
 * 索引说明：
 * - participants: 查询用户的会话
 * - lastMessageAt: 按时间排序
 */

const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  // 参与者 ID 列表（2个用户）
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  // 最后一条消息内容
  lastMessage: { 
    type: String, 
    default: '' 
  },
  // 最后消息时间
  lastMessageAt: { 
    type: Date, 
    default: Date.now 
  },
  // 置顶用户列表
  pinnedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // 静音用户列表
  mutedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  // 删除会话的用户列表
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  // 用户删除时间快照
  deletedSnapshots: {
    type: Map,
    of: Date,
    default: {},
  },
  // 最后清理时间
  lastClearedAt: {
    type: Date,
    default: null,
  },
}, { 
  timestamps: true 
});

// 参与者索引
ConversationSchema.index({ participants: 1 });

// 最后消息时间索引
ConversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
