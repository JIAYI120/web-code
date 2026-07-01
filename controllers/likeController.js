/**
 * 点赞控制器
 * 
 * 功能：
 * - 点赞/取消点赞帖子
 * - 查询点赞状态
 * - 获取用户点赞列表
 * 
 * API 接口：
 * - POST /api/likes/:postId - 点赞帖子
 * - DELETE /api/likes/:postId - 取消点赞
 * - GET /api/likes/status?posts=id1,id2 - 批量查询点赞状态
 * - GET /api/likes/mine - 获取我的点赞列表
 */

const Like = require('../models/Like');
const Post = require('../models/Post');
const { createInteractionNotification, deleteInteractionNotification } = require('../utils/interactionNotifications');
const { success, fail, error } = require('../utils/response');
const { attachPostUsers } = require('../utils/postHelper');
const cache = require('../utils/cache');
const { logger } = require('../utils/logger');

/**
 * 点赞帖子
 * @param {string} req.params.postId - 帖子 ID
 * @returns {object} - 点赞记录
 */
exports.likePost = async (req, res) => {
  try {
    const postId = req.params.postId;

    // 查询帖子
    const post = await Post.findById(postId).select('user likeCount');
    if (!post) return fail(res, '帖子不存在', 1, 404);

    // 创建点赞记录
    let like;
    try {
      like = await Like.create({ user: req.user.id, post: postId });
    } catch (createErr) {
      // 唯一索引冲突说明已点赞，返回成功
      if (createErr?.code === 11000) {
        return success(res, null, '已点赞');
      }
      throw createErr;
    }

    const postOwnerId = post.user;

    // 更新帖子点赞数
    post.likeCount = await Like.countDocuments({ post: postId });
    await post.save();

    // 创建互动通知
    if (postOwnerId) {
      await createInteractionNotification({
        recipient: postOwnerId,
        actor: req.user.id,
        type: 'like',
        post: postId,
      });
    }

    // 清除缓存
    cache.del('post:' + postId);
    cache.invalidatePattern('^feed:');
    success(res, like);
  } catch (err) {
    logger.error('[likeController.likePost]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 取消点赞
 * @param {string} req.params.postId - 帖子 ID
 * @returns {object} - 取消成功消息
 */
exports.unlikePost = async (req, res) => {
  try {
    const postId = req.params.postId;

    // 查询帖子
    const post = await Post.findById(postId).select('user likeCount');
    if (!post) return fail(res, '帖子不存在', 1, 404);

    // 删除点赞记录
    const like = await Like.findOneAndDelete({ user: req.user.id, post: postId });
    if (!like) return success(res, null, '已取消点赞');

    const postOwnerId = post.user;

    // 更新帖子点赞数
    post.likeCount = await Like.countDocuments({ post: postId });
    await post.save();

    // 删除互动通知
    if (postOwnerId) {
      await deleteInteractionNotification({
        recipient: postOwnerId,
        actor: req.user.id,
        type: 'like',
        post: postId,
      });
    }

    // 清除缓存
    cache.del('post:' + postId);
    cache.invalidatePattern('^feed:');
    success(res, null, '已取消点赞');
  } catch (err) {
    logger.error('[likeController.unlikePost]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 批量查询点赞状态
 * @param {string} req.query.posts - 帖子 ID 列表（逗号分隔）
 * @returns {object} - 帖子 ID 到点赞状态的映射
 */
exports.getLikeStatus = async (req, res) => {
  try {
    const postIds = req.query.posts;
    if (!postIds) return success(res, {});
    const ids = Array.isArray(postIds) ? postIds : postIds.split(',');
    
    // 限制查询数量，防止数据库压力过大
    if (ids.length > 100) {
      return fail(res, '单次查询不能超过100个帖子');
    }
    
    const likes = await Like.find({ user: req.user.id, post: { $in: ids } });
    const map = {};
    likes.forEach(l => { map[l.post.toString()] = true; });
    success(res, map);
  } catch (err) {
    logger.error('[likeController.getLikeStatus]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取我的点赞列表
 * @returns {Array} - 点赞的帖子列表
 */
exports.getMyLikes = async (req, res) => {
  try {
    const cacheKey = 'likes:user:' + req.user.id;
    let posts = cache.get(cacheKey);
    if (!posts) {
      const likes = await Like.find({ user: req.user.id }).sort({ createdAt: -1 });
      const postIds = likes.map(l => l.post);
      const rawPosts = await Post.find({ _id: { $in: postIds } }).sort({ createdAt: -1 });
      posts = await attachPostUsers(rawPosts);
      cache.set(cacheKey, posts, 15000);
    }
    success(res, posts);
  } catch (err) {
    logger.error('[likeController.getMyLikes]', { error: err.message, stack: err.stack });
    error(res);
  }
};
