/**
 * 个人资料模型
 * 
 * 字段说明：
 * - user: 用户 ID（关联 User，唯一索引）
 * - nickname: 昵称
 * - identity: 身份（学生/老师/职工）
 * - bio: 个人简介
 * - gender: 性别
 * - birthday: 生日
 * - location: 所在地
 * 
 * 索引说明：
 * - user: 唯一索引
 * - nickname: 普通索引，用于搜索
 */

const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  // 用户 ID
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // 昵称
  nickname: { 
    type: String, 
    default: '' 
  },
  // 身份
  identity: { 
    type: String, 
    default: '学生' 
  },
  // 个人简介
  bio: { 
    type: String, 
    default: '用文字记录校园生活的每一刻' 
  },
  // 性别
  gender: { 
    type: String, 
    default: '' 
  },
  // 生日
  birthday: { 
    type: String, 
    default: '' 
  },
  // 所在地
  location: { 
    type: String, 
    default: '' 
  },
}, { 
  timestamps: true 
});

// 昵称索引（用于搜索）
ProfileSchema.index({ nickname: 1 });

module.exports = mongoose.model('Profile', ProfileSchema);
