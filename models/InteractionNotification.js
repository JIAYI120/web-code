/**
 * 互动通知模型
 * 
 * 字段说明：
 * - recipient: 接收者 ID（被通知的用户）
 * - actor: 操作者 ID（触发通知的用户）
 * - type: 通知类型（like/comment/bookmark/follow）
 * - post: 相关帖子 ID
 * - comment: 相关评论 ID
 * - content: 评论内容（用于显示）
 * - isRead: 是否已读
 * 
 * 索引说明：
 * - recipient + createdAt: 按用户查询通知
 */

const mongoose = require('mongoose');

const InteractionNotificationSchema = new mongoose.Schema({
  // 接收者 ID
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 操作者 ID
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 通知类型
  type: {
    type: String,
    enum: ['like', 'comment', 'bookmark', 'follow'],
    required: true,
  },
  // 相关帖子 ID
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null,
  },
  // 相关评论 ID
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  // 评论内容
  content: {
    type: String,
    default: '',
  },
  // 是否已读
  isRead: {
    type: Boolean,
    default: false,
  },
}, { 
  timestamps: true 
});

// 接收者和时间索引
InteractionNotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('InteractionNotification', InteractionNotificationSchema);
