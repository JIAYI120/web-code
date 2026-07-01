/**
 * 帖子模型
 * 
 * 字段说明：
 * - user: 发布者 ID（关联 User）
 * - content: 帖子内容
 * - topic: 话题标签
 * - images: 图片列表
 * - likeCount: 点赞数（冗余字段，提高查询效率）
 * - commentCount: 评论数
 * - bookmarkCount: 收藏数
 * 
 * 索引说明：
 * - user + createdAt: 按用户查询帖子
 * - createdAt: 按时间排序
 * - topic: 按话题查询
 * - content + topic: 全文搜索
 */

const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  // 发布者 ID
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 帖子内容
  content: {
    type: String,
    required: true,
  },
  // 话题标签
  topic: {
    type: String,
    default: '',
  },
  // 图片列表（URL 数组）
  images: {
    type: [String],
    default: [],
  },
  // 点赞数（冗余字段）
  likeCount: {
    type: Number,
    default: 0,
  },
  // 评论数（冗余字段）
  commentCount: {
    type: Number,
    default: 0,
  },
  // 收藏数（冗余字段）
  bookmarkCount: {
    type: Number,
    default: 0,
  },
  // AI 情绪分析结果
  mood: {
    type: String,
    enum: ['开心', '难过', '愤怒', '惊讶', '平静', '激动', '无聊', '焦虑', '期待', ''],
    default: '',
  },
  // 情绪对应的 emoji
  moodEmoji: {
    type: String,
    default: '',
  },
}, { 
  timestamps: true 
});

// 复合索引：按用户和时间排序
PostSchema.index({ user: 1, createdAt: -1 });

// 单字段索引：按话题查询
PostSchema.index({ topic: 1 });

// 全文搜索索引
PostSchema.index({ content: 'text', topic: 'text' });

module.exports = mongoose.model('Post', PostSchema);
