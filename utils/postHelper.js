/**
 * 帖子辅助工具
 * 
 * 功能：
 * - attachPostUsers: 为帖子列表附加用户信息
 * - normalizeDraft: 格式化草稿数据
 */

const Profile = require('../models/Profile');
const User = require('../models/User');

/**
 * 为帖子列表附加用户信息
 * @param {Array} posts - 帖子列表
 * @returns {Array} - 附加了用户信息的帖子列表
 */
async function attachPostUsers(posts) {
  if (!posts.length) return [];
  
  // 提取所有用户 ID
  const userIds = [...new Set(posts.map(p => p.user.toString()))];
  
  // 并行查询用户信息
  const [profiles, users] = await Promise.all([
    Profile.find({ user: { $in: userIds } }),
    User.find({ _id: { $in: userIds } }).select('name'),
  ]);
  
  // 构建查找映射
  const profileMap = {};
  profiles.forEach(p => { profileMap[p.user.toString()] = p; });
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });
  
  // 附加用户信息
  return posts.map(p => {
    const uid = p.user.toString();
    const prof = profileMap[uid];
    const u = userMap[uid];
    return {
      ...p.toObject(),
      nickname: prof?.nickname || u?.name || '',
      identity: prof?.identity || '学生',
    };
  });
}

/**
 * 格式化草稿数据
 * @param {object} draft - 草稿对象
 * @returns {object} - 格式化后的草稿
 */
function normalizeDraft(draft) {
  return draft.toObject();
}

module.exports = { attachPostUsers, normalizeDraft };
