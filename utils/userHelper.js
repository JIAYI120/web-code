/**
 * 用户辅助工具
 * 
 * 功能：
 * - getProfileMap: 批量获取用户资料
 * - getUserMap: 批量获取用户信息
 * - buildUserItem: 构建用户信息对象
 */

const Profile = require('../models/Profile');
const User = require('../models/User');

/**
 * 批量获取用户资料
 * @param {Array} userIds - 用户 ID 列表
 * @returns {object} - 用户 ID 到资料的映射
 */
async function getProfileMap(userIds = []) {
  if (!userIds.length) return {};
  const profiles = await Profile.find({ user: { $in: userIds } });
  return profiles.reduce((map, item) => {
    map[item.user.toString()] = item;
    return map;
  }, {});
}

/**
 * 批量获取用户信息
 * @param {Array} userIds - 用户 ID 列表
 * @returns {object} - 用户 ID 到用户信息的映射
 */
async function getUserMap(userIds = []) {
  if (!userIds.length) return {};
  const users = await User.find({ _id: { $in: userIds } }).select('name');
  return users.reduce((map, item) => {
    map[item._id.toString()] = item;
    return map;
  }, {});
}

/**
 * 构建用户信息对象
 * @param {string} uid - 用户 ID
 * @param {object} profileMap - 资料映射
 * @param {object} userMap - 用户信息映射
 * @param {object} extra - 额外字段
 * @returns {object} - 用户信息对象
 */
function buildUserItem(uid, profileMap, userMap, extra = {}) {
  const prof = profileMap[uid];
  const u = userMap[uid];
  return {
    _id: uid,
    nickname: prof?.nickname || u?.name || '',
    identity: prof?.identity || '学生',
    ...extra,
  };
}

module.exports = { getProfileMap, getUserMap, buildUserItem };
