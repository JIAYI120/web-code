/**
 * 关注模型
 * 
 * 字段说明：
 * - follower: 关注者 ID（关联 User）
 * - following: 被关注者 ID（关联 User）
 * 
 * 索引说明：
 * - follower + following: 唯一索引，防止重复关注
 */

const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema({
  // 关注者 ID
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 被关注者 ID
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { 
  timestamps: true 
});

// 唯一索引：一个用户只能关注另一个用户一次
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

module.exports = mongoose.model('Follow', FollowSchema);
