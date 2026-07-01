/**
 * 消息模型
 * 
 * 字段说明：
 * - conversation: 会话 ID（关联 Conversation）
 * - sender: 发送者 ID（关联 User）
 * - receiver: 接收者 ID（关联 User）
 * - content: 消息内容
 * - isRead: 是否已读
 * 
 * 索引说明：
 * - conversation + createdAt: 按会话查询消息
 * - receiver + isRead: 查询未读消息
 */

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // 会话 ID
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  // 发送者 ID
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 接收者 ID
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 消息内容
  content: {
    type: String,
    required: true,
    trim: true,
  },
  // 是否已读
  isRead: {
    type: Boolean,
    default: false,
  },
}, { 
  timestamps: true 
});

// 会话和时间索引
MessageSchema.index({ conversation: 1, createdAt: 1 });

// 接收者和已读状态索引（查询未读消息）
MessageSchema.index({ receiver: 1, isRead: 1 });

module.exports = mongoose.model('Message', MessageSchema);
