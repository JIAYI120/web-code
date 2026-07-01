/**
 * 关注控制器
 * 
 * 功能：
 * - 关注/取消关注用户
 * - 获取关注列表和粉丝列表
 * - 获取关注统计数据
 * 
 * API 接口：
 * - GET /api/follow/count - 获取关注和粉丝数量
 * - GET /api/follow/following - 获取关注列表
 * - GET /api/follow/fans - 获取粉丝列表
 * - POST /api/follow/:userId - 关注用户
 * - DELETE /api/follow/:userId - 取消关注
 */

const Follow = require('../models/Follow');
const { createInteractionNotification } = require('../utils/interactionNotifications');
const { success, fail, error } = require('../utils/response');
const { getProfileMap, getUserMap, buildUserItem } = require('../utils/userHelper');
const cache = require('../utils/cache');
const { logger } = require('../utils/logger');

/**
 * 获取关注和粉丝数量
 * @returns {object} - { followingCount, fansCount }
 */
exports.getCount = async (req, res) => {
  try {
    const cacheKey = 'follow:count:' + req.user.id;
    let counts = cache.get(cacheKey);
    if (!counts) {
      const followingCount = await Follow.countDocuments({ follower: req.user.id });
      const fansCount = await Follow.countDocuments({ following: req.user.id });
      counts = { followingCount, fansCount };
      cache.set(cacheKey, counts, 30000);
    }
    success(res, counts);
  } catch (err) {
    logger.error('[followController.getCount]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取关注列表
 * @returns {Array} - 关注的用户列表
 */
exports.getFollowing = async (req, res) => {
  try {
    const cacheKey = 'follow:following:' + req.user.id;
    let result = cache.get(cacheKey);
    if (!result) {
      const follows = await Follow.find({ follower: req.user.id });
      const userIds = follows.map(f => f.following.toString());
      const [profileMap, userMap] = await Promise.all([
        getProfileMap(userIds),
        getUserMap(userIds),
      ]);
      result = userIds.map(uid =>
        buildUserItem(uid, profileMap, userMap, { isFollowing: true })
      );
      cache.set(cacheKey, result, 30000);
    }
    success(res, result);
  } catch (err) {
    logger.error('[followController.getFollowing]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取粉丝列表
 * @returns {Array} - 粉丝用户列表（包含是否互相关注）
 */
exports.getFans = async (req, res) => {
  try {
    const cacheKey = 'follow:fans:' + req.user.id;
    let result = cache.get(cacheKey);
    if (!result) {
      const follows = await Follow.find({ following: req.user.id });
      const userIds = follows.map(f => f.follower.toString());
      const [profileMap, userMap] = await Promise.all([
        getProfileMap(userIds),
        getUserMap(userIds),
      ]);
      // 查询我关注的人
      const myFollowing = await Follow.find({ follower: req.user.id }).select('following');
      const myFollowingSet = new Set(myFollowing.map(f => f.following.toString()));
      // 构建粉丝列表，标记是否互相关注
      result = userIds.map(uid =>
        buildUserItem(uid, profileMap, userMap, { mutual: myFollowingSet.has(uid) })
      );
      cache.set(cacheKey, result, 30000);
    }
    success(res, result);
  } catch (err) {
    logger.error('[followController.getFans]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 关注用户
 * @param {string} req.params.userId - 要关注的用户 ID
 * @returns {object} - 关注结果（包含是否互相关注）
 */
exports.followUser = async (req, res) => {
  try {
    // 不能关注自己
    if (req.params.userId === req.user.id) return fail(res, '不能关注自己');
    
    // 检查是否已关注
    const existing = await Follow.findOne({ follower: req.user.id, following: req.params.userId });
    if (existing) return fail(res, '已关注');

    // 创建关注记录
    const follow = new Follow({ follower: req.user.id, following: req.params.userId });
    await follow.save();
    
    // 创建互动通知
    await createInteractionNotification({
      recipient: req.params.userId,
      actor: req.user.id,
      type: 'follow',
    });
    
    // 检查是否互相关注
    const isMutual = await Follow.exists({ follower: req.params.userId, following: req.user.id });
    
    // 清除缓存
    cache.invalidatePattern('^follow:');
    cache.invalidatePattern('^profile:' + req.user.id);
    cache.invalidatePattern('^profile:' + req.params.userId);
    
    success(res, { ...follow.toObject(), isMutual: Boolean(isMutual) });
  } catch (err) {
    logger.error('[followController.followUser]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 取消关注
 * @param {string} req.params.userId - 要取消关注的用户 ID
 * @returns {object} - 取消成功消息
 */
exports.unfollowUser = async (req, res) => {
  try {
    await Follow.findOneAndDelete({ follower: req.user.id, following: req.params.userId });
    
    // 清除缓存
    cache.invalidatePattern('^follow:');
    cache.invalidatePattern('^profile:' + req.user.id);
    cache.invalidatePattern('^profile:' + req.params.userId);
    
    success(res, null, '已取消关注');
  } catch (err) {
    logger.error('[followController.unfollowUser]', { error: err.message, stack: err.stack });
    error(res);
  }
};
