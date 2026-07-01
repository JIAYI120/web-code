/**
 * 收藏控制器
 * 
 * 功能：
 * - 收藏/取消收藏帖子
 * - 查询收藏状态
 * - 获取用户收藏列表
 * 
 * API 接口：
 * - POST /api/bookmarks/:postId - 收藏帖子
 * - DELETE /api/bookmarks/:postId - 取消收藏
 * - GET /api/bookmarks/status?posts=id1,id2 - 批量查询收藏状态
 * - GET /api/bookmarks/mine - 获取我的收藏列表
 */

const Bookmark = require('../models/Bookmark');
const Post = require('../models/Post');
const { createInteractionNotification, deleteInteractionNotification } = require('../utils/interactionNotifications');
const { success, fail, error } = require('../utils/response');
const { attachPostUsers } = require('../utils/postHelper');
const cache = require('../utils/cache');
const { logger } = require('../utils/logger');

/**
 * 收藏帖子
 * @param {string} req.params.postId - 帖子 ID
 * @returns {object} - 收藏记录
 */
exports.bookmarkPost = async (req, res) => {
  try {
    const postId = req.params.postId;

    // 查询帖子
    const post = await Post.findById(postId).select('user bookmarkCount');
    if (!post) return fail(res, '帖子不存在', 1, 404);

    // 创建收藏记录
    let bookmark;
    try {
      bookmark = await Bookmark.create({ user: req.user.id, post: postId });
    } catch (createErr) {
      // 唯一索引冲突说明已收藏，返回成功
      if (createErr?.code === 11000) {
        return success(res, null, '已收藏');
      }
      throw createErr;
    }

    const postOwnerId = post.user;

    // 更新帖子收藏数
    post.bookmarkCount = await Bookmark.countDocuments({ post: postId });
    await post.save();

    // 创建互动通知
    if (postOwnerId) {
      await createInteractionNotification({
        recipient: postOwnerId,
        actor: req.user.id,
        type: 'bookmark',
        post: postId,
      });
    }

    // 清除缓存
    cache.del('post:' + postId);
    cache.invalidatePattern('^feed:');
    cache.invalidatePattern('^bookmarks:user:' + req.user.id);
    success(res, bookmark);
  } catch (err) {
    logger.error('[bookmarkController.bookmarkPost]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 取消收藏
 * @param {string} req.params.postId - 帖子 ID
 * @returns {object} - 取消成功消息
 */
exports.unbookmarkPost = async (req, res) => {
  try {
    const postId = req.params.postId;

    // 查询帖子
    const post = await Post.findById(postId).select('user bookmarkCount');
    if (!post) return fail(res, '帖子不存在', 1, 404);

    // 删除收藏记录
    const bookmark = await Bookmark.findOneAndDelete({ user: req.user.id, post: postId });
    if (!bookmark) return success(res, null, '已取消收藏');

    const postOwnerId = post.user;

    // 更新帖子收藏数
    post.bookmarkCount = await Bookmark.countDocuments({ post: postId });
    await post.save();

    // 删除互动通知
    if (postOwnerId) {
      await deleteInteractionNotification({
        recipient: postOwnerId,
        actor: req.user.id,
        type: 'bookmark',
        post: postId,
      });
    }

    // 清除缓存
    cache.del('post:' + postId);
    cache.invalidatePattern('^feed:');
    cache.invalidatePattern('^bookmarks:user:' + req.user.id);
    success(res, null, '已取消收藏');
  } catch (err) {
    logger.error('[bookmarkController.unbookmarkPost]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 批量查询收藏状态
 * @param {string} req.query.posts - 帖子 ID 列表
 * @returns {object} - 帖子 ID 到收藏状态的映射
 */
exports.getBookmarkStatus = async (req, res) => {
  try {
    const postIds = req.query.posts;
    if (!postIds) return success(res, {});
    const ids = Array.isArray(postIds) ? postIds : postIds.split(',');
    
    // 限制查询数量，防止数据库压力过大
    if (ids.length > 100) {
      return fail(res, '单次查询不能超过100个帖子');
    }
    
    const bookmarks = await Bookmark.find({ user: req.user.id, post: { $in: ids } });
    const map = {};
    bookmarks.forEach(b => { map[b.post.toString()] = true; });
    success(res, map);
  } catch (err) {
    logger.error('[bookmarkController.getBookmarkStatus]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取我的收藏列表
 * @returns {Array} - 收藏的帖子列表
 */
exports.getMyBookmarks = async (req, res) => {
  try {
    const cacheKey = 'bookmarks:user:' + req.user.id;
    let posts = cache.get(cacheKey);
    if (!posts) {
      const bookmarks = await Bookmark.find({ user: req.user.id }).sort({ createdAt: -1 });
      const postIds = bookmarks.map(b => b.post);
      const rawPosts = await Post.find({ _id: { $in: postIds } }).sort({ createdAt: -1 });
      posts = await attachPostUsers(rawPosts);
      cache.set(cacheKey, posts, 15000);
    }
    success(res, posts);
  } catch (err) {
    logger.error('[bookmarkController.getMyBookmarks]', { error: err.message, stack: err.stack });
    error(res);
  }
};
