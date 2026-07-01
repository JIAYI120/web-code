/**
 * 评论模型
 * 
 * 字段说明：
 * - user: 评论者 ID（关联 User）
 * - post: 所属帖子 ID（关联 Post）
 * - parent: 父评论 ID（用于二级评论，null 表示一级评论）
 * - replyTo: 被回复用户 ID（用于显示"回复 xxx"）
 * - content: 评论内容
 * - likeCount: 点赞数
 * 
 * 索引说明：
 * - post + createdAt: 按帖子查询评论
 * - parent + createdAt: 按父评论查询回复
 */

const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  // 评论者 ID
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 所属帖子 ID
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  // 父评论 ID（null 表示一级评论）
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  // 被回复用户 ID
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // 评论内容
  content: {
    type: String,
    required: true,
  },
  // 点赞数
  likeCount: {
    type: Number,
    default: 0,
  },
}, { 
  timestamps: true 
});

// 按帖子和时间排序
CommentSchema.index({ post: 1, createdAt: -1 });

// 按父评论和时间排序（查询回复）
CommentSchema.index({ parent: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', CommentSchema);
