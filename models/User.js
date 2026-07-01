/**
 * 用户模型
 * 
 * 字段说明：
 * - name: 用户名（唯一索引）
 * - password: 加密后的密码
 * 
 * 关联关系：
 * - 一个用户对应一个 Profile
 * - 一个用户可以发布多个 Post
 * - 一个用户可以发送多个 Message
 */

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // 用户名，唯一索引，用于登录
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  // 加密后的密码
  password: { 
    type: String, 
    required: true 
  },
}, { 
  timestamps: true  // 自动添加 createdAt 和 updatedAt 
});

module.exports = mongoose.model('User', UserSchema);
