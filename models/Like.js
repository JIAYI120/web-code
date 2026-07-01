/**
 * 点赞模型
 * 
 * 字段说明：
 * - user: 点赞者 ID（关联 User）
 * - post: 被点赞帖子 ID（关联 Post）
 * 
 * 索引说明：
 * - user + post: 唯一索引，防止重复点赞
 */

const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  // 点赞者 ID
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 被点赞帖子 ID
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
}, { 
  timestamps: true 
});

// 唯一索引：一个用户只能点赞一个帖子一次
LikeSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Like', LikeSchema);
