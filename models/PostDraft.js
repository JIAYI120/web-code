/**
 * 草稿模型
 * 
 * 字段说明：
 * - user: 用户 ID（关联 User）
 * - content: 草稿内容
 * - topic: 话题标签
 * - images: 图片列表
 * 
 * 索引说明：
 * - user + updatedAt: 按用户查询草稿
 */

const mongoose = require('mongoose');

const PostDraftSchema = new mongoose.Schema({
  // 用户 ID
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // 草稿内容
  content: {
    type: String,
    default: '',
  },
  // 话题标签
  topic: {
    type: String,
    default: '',
  },
  // 图片列表
  images: {
    type: [String],
    default: [],
  },
}, { 
  timestamps: true 
});

module.exports = mongoose.model('PostDraft', PostDraftSchema);
