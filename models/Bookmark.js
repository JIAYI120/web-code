/**
 * 收藏模型
 * 
 * 字段说明：
 * - user: 收藏者 ID（关联 User）
 * - post: 被收藏帖子 ID（关联 Post）
 * 
 * 索引说明：
 * - user + post: 唯一索引，防止重复收藏
 */

const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  // 收藏者 ID
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 被收藏帖子 ID
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
}, { 
  timestamps: true 
});

// 唯一索引：一个用户只能收藏一个帖子一次
BookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', BookmarkSchema);
