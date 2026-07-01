/**
 * 帖子控制器
 * 
 * 功能：
 * - 帖子的增删改查
 * - 帖子列表（动态流、朋友动态、用户帖子）
 * - 帖子搜索
 * - 草稿管理
 * 
 * API 接口：
 * - GET /api/posts/feed - 获取动态流
 * - GET /api/posts/friends - 获取朋友动态
 * - GET /api/posts/mine - 获取我的帖子
 * - GET /api/posts/search?q=keyword - 搜索帖子
 * - GET /api/posts/count - 获取帖子数量
 * - GET /api/posts/user/:userId - 获取用户帖子
 * - POST /api/posts - 创建帖子
 * - DELETE /api/posts/:id - 删除帖子
 * - GET /api/posts/:id - 获取帖子详情
 * - GET /api/posts/drafts - 获取草稿列表
 * - POST /api/posts/drafts - 创建草稿
 * - PUT /api/posts/drafts/:id - 更新草稿
 * - DELETE /api/posts/drafts/:id - 删除草稿
 */

const Post = require('../models/Post');
const PostDraft = require('../models/PostDraft');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const Bookmark = require('../models/Bookmark');
const Comment = require('../models/Comment');
const { success, fail, error } = require('../utils/response');
const { attachPostUsers, normalizeDraft } = require('../utils/postHelper');
const { parsePagination, paginationResult } = require('../utils/pagination');
const cache = require('../utils/cache');
const { logger } = require('../utils/logger');

// 情绪映射表
const MOOD_MAP = {
  '开心': '😊',
  '难过': '😢',
  '愤怒': '😠',
  '惊讶': '😲',
  '平静': '😌',
  '激动': '🤩',
  '无聊': '😑',
  '焦虑': '😰',
  '期待': '🤗',
};

/**
 * 情绪分析
 * @param {string} content - 帖子内容
 * @returns {object} - { mood, emoji }
 */
async function analyzeMood(content) {
  try {
    const API_KEY = process.env.XIAOMI_API_KEY;
    const BASE_URL = process.env.XIAOMI_API_BASE_URL;
    const MODEL = process.env.XIAOMI_MODEL;

    if (!API_KEY || !BASE_URL) {
      return { mood: '平静', emoji: '😌' };
    }

    const url = BASE_URL.endsWith('/v1')
      ? BASE_URL + '/chat/completions'
      : BASE_URL + '/v1/chat/completions';

    const systemMessage = {
      role: 'system',
      content: `你是一个情绪分析助手。请分析用户提供的文本内容，判断其表达的主要情绪。
      
只能从以下情绪中选择一个最匹配的：
- 开心（快乐、高兴、喜悦）
- 难过（悲伤、伤心、失落）
- 愤怒（生气、不满、烦躁）
- 惊讶（意外、震惊、吃惊）
- 平静（淡定、从容、平和）
- 激动（兴奋、热情、亢奋）
- 无聊（无趣、乏味、空虚）
- 焦虑（担心、紧张、不安）
- 期待（盼望、憧憬、向往）

请只返回一个情绪词，不要返回其他任何内容。`,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, { role: 'user', content }],
        stream: false,
      }),
    });

    if (!response.ok) {
      return { mood: '平静', emoji: '😌' };
    }

    const data = await response.json();
    const moodText = data.choices?.[0]?.message?.content?.trim() || '';

    for (const [key, value] of Object.entries(MOOD_MAP)) {
      if (moodText.includes(key)) {
        return { mood: key, emoji: value };
      }
    }

    return { mood: '平静', emoji: '😌' };
  } catch (err) {
    logger.error('[analyzeMood]', { error: err.message, stack: err.stack });
    return { mood: '平静', emoji: '😌' };
  }
}

/**
 * 获取草稿列表
 * @returns {Array} - 用户的所有草稿
 */
exports.getDrafts = async (req, res) => {
  try {
    const cacheKey = 'drafts:' + req.user.id;
    let drafts = cache.get(cacheKey);
    if (!drafts) {
      drafts = await PostDraft.find({ user: req.user.id }).sort({ updatedAt: -1 });
      cache.set(cacheKey, drafts, 30000);
    }
    success(res, drafts.map(normalizeDraft));
  } catch (err) {
    logger.error('[postController.getDrafts]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 创建草稿
 * @param {string} req.body.content - 草稿内容
 * @param {Array} req.body.images - 图片列表
 * @param {string} req.body.topic - 话题
 * @returns {object} - 创建的草稿
 */
exports.createDraft = async (req, res) => {
  try {
    const { content, images, topic } = req.body;
    const draft = new PostDraft({
      user: req.user.id,
      content: typeof content === 'string' ? content.trim() : '',
      topic: typeof topic === 'string' ? topic.trim() : '',
      images: Array.isArray(images) ? images : [],
    });
    await draft.save();
    cache.del('drafts:' + req.user.id);
    success(res, normalizeDraft(draft));
  } catch (err) {
    logger.error('[postController.createDraft]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 更新草稿
 * @param {string} req.params.id - 草稿 ID
 * @param {string} req.body.content - 草稿内容
 * @param {Array} req.body.images - 图片列表
 * @param {string} req.body.topic - 话题
 * @returns {object} - 更新后的草稿
 */
exports.updateDraft = async (req, res) => {
  try {
    const draft = await PostDraft.findById(req.params.id);
    if (!draft) return fail(res, '草稿不存在', 1, 404);
    if (draft.user.toString() !== req.user.id) return fail(res, '无权修改', 1, 403);
    
    draft.content = typeof req.body.content === 'string' ? req.body.content.trim() : draft.content;
    draft.topic = typeof req.body.topic === 'string' ? req.body.topic.trim() : draft.topic;
    draft.images = Array.isArray(req.body.images) ? req.body.images : draft.images;
    await draft.save();
    cache.del('drafts:' + req.user.id);
    success(res, normalizeDraft(draft));
  } catch (err) {
    logger.error('[postController.updateDraft]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 删除草稿
 * @param {string} req.params.id - 草稿 ID
 * @returns {object} - 删除成功消息
 */
exports.deleteDraft = async (req, res) => {
  try {
    const draft = await PostDraft.findById(req.params.id);
    if (!draft) return fail(res, '草稿不存在', 1, 404);
    if (draft.user.toString() !== req.user.id) return fail(res, '无权删除', 1, 403);
    
    await draft.deleteOne();
    cache.del('drafts:' + req.user.id);
    success(res, null, '已删除');
  } catch (err) {
    logger.error('[postController.deleteDraft]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取我的帖子
 * @param {number} req.query.page - 页码
 * @param {number} req.query.pageSize - 每页数量
 * @returns {object} - 分页后的帖子列表
 */
exports.getMyPosts = async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const cacheKey = 'posts:user:' + req.user.id + ':' + page + ':' + pageSize;
    let result = cache.get(cacheKey);
    if (!result) {
      const [posts, total] = await Promise.all([
        Post.find({ user: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
        Post.countDocuments({ user: req.user.id }),
      ]);
      result = paginationResult(await attachPostUsers(posts), total, { page, pageSize });
      cache.set(cacheKey, result, 15000);
    }
    success(res, result);
  } catch (err) {
    logger.error('[postController.getMyPosts]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取动态流（所有帖子）
 * @param {number} req.query.page - 页码
 * @param {number} req.query.pageSize - 每页数量
 * @returns {object} - 分页后的帖子列表
 */
exports.getFeed = async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const cacheKey = 'feed:' + page + ':' + pageSize;
    let result = cache.get(cacheKey);
    if (!result) {
      const [posts, total] = await Promise.all([
        Post.find().sort({ createdAt: -1 }).skip(skip).limit(pageSize),
        Post.countDocuments(),
      ]);
      result = paginationResult(await attachPostUsers(posts), total, { page, pageSize });
      cache.set(cacheKey, result, 10000);
    }
    success(res, result);
  } catch (err) {
    logger.error('[postController.getFeed]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 搜索帖子
 * @param {string} req.query.q - 搜索关键词
 * @param {number} req.query.page - 页码
 * @param {number} req.query.pageSize - 每页数量
 * @returns {object} - 分页后的搜索结果
 */
exports.searchPosts = async (req, res) => {
  try {
    const keyword = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!keyword) return success(res, paginationResult([], 0, { page: 1, pageSize: 20 }));

    const { page, pageSize, skip } = parsePagination(req.query);
    const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeKeyword, 'i');
    const filter = { $or: [{ content: regex }, { topic: regex }] };

    const [posts, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Post.countDocuments(filter),
    ]);

    success(res, paginationResult(await attachPostUsers(posts), total, { page, pageSize }));
  } catch (err) {
    logger.error('[postController.searchPosts]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取朋友动态（互相关注的用户）
 * @param {number} req.query.page - 页码
 * @param {number} req.query.pageSize - 每页数量
 * @returns {object} - 分页后的帖子列表
 */
exports.getFriendsPosts = async (req, res) => {
  try {
    // 获取我关注的人
    const myFollowing = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = myFollowing.map(item => item.following.toString());
    if (followingIds.length === 0) return success(res, paginationResult([], 0, { page: 1, pageSize: 20 }));

    // 获取也关注我的人（互相关注）
    const reverseFollows = await Follow.find({
      follower: { $in: followingIds },
      following: req.user.id,
    }).select('follower');
    const friendIds = reverseFollows.map(item => item.follower.toString());
    if (friendIds.length === 0) return success(res, paginationResult([], 0, { page: 1, pageSize: 20 }));

    // 查询朋友的帖子
    const { page, pageSize, skip } = parsePagination(req.query);
    const filter = { user: { $in: friendIds } };
    const [posts, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Post.countDocuments(filter),
    ]);
    success(res, paginationResult(await attachPostUsers(posts), total, { page, pageSize }));
  } catch (err) {
    logger.error('[postController.getFriendsPosts]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取帖子数量
 * @returns {object} - 帖子数量
 */
exports.getPostCount = async (req, res) => {
  try {
    const count = await Post.countDocuments({ user: req.user.id });
    success(res, { count });
  } catch (err) {
    logger.error('[postController.getPostCount]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取随机帖子
 * @returns {object} - 随机帖子
 */
exports.getRandomPost = async (req, res) => {
  try {
    const count = await Post.countDocuments();
    if (count === 0) {
      return success(res, null);
    }
    
    const randomIndex = Math.floor(Math.random() * count);
    const post = await Post.findOne().skip(randomIndex);
    
    if (!post) {
      return success(res, null);
    }
    
    const [result] = await attachPostUsers([post]);
    success(res, result);
  } catch (err) {
    logger.error('[postController.getRandomPost]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取用户帖子
 * @param {string} req.params.userId - 用户 ID
 * @param {number} req.query.page - 页码
 * @param {number} req.query.pageSize - 每页数量
 * @returns {object} - 分页后的帖子列表
 */
exports.getUserPosts = async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const filter = { user: req.params.userId };
    const [posts, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Post.countDocuments(filter),
    ]);
    success(res, paginationResult(await attachPostUsers(posts), total, { page, pageSize }));
  } catch (err) {
    logger.error('[postController.getUserPosts]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 创建帖子
 * @param {string} req.body.content - 帖子内容
 * @param {Array} req.body.images - 图片列表
 * @param {string} req.body.topic - 话题
 * @param {string} req.body.draftId - 草稿 ID（发布后删除草稿）
 * @returns {object} - 创建的帖子
 */
exports.createPost = async (req, res) => {
  try {
    const { content, images, topic, draftId } = req.body;
    
    // 分析情绪
    const { mood, emoji } = await analyzeMood(content);
    
    const post = new Post({
      user: req.user.id,
      content,
      topic: typeof topic === 'string' ? topic.trim() : '',
      images: images || [],
      mood,
      moodEmoji: emoji,
    });
    
    await post.save();

    // 如果有草稿 ID，删除对应的草稿
    if (draftId) {
      const draft = await PostDraft.findById(draftId);
      if (draft && draft.user.toString() === req.user.id) {
        await draft.deleteOne();
        cache.del('drafts:' + req.user.id);
      }
    }

    // 清除相关缓存
    cache.invalidatePattern('^feed:');
    cache.invalidatePattern('^posts:user:' + req.user.id);
    success(res, post);
  } catch (err) {
    logger.error('[postController.createPost]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 删除帖子
 * @param {string} req.params.id - 帖子 ID
 * @returns {object} - 删除成功消息
 */
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return fail(res, '动态不存在', 1, 404);
    if (post.user.toString() !== req.user.id) return fail(res, '无权删除', 1, 403);

    // 同时删除相关的点赞、收藏、评论
    await Promise.all([
      Like.deleteMany({ post: req.params.id }),
      Bookmark.deleteMany({ post: req.params.id }),
      Comment.deleteMany({ post: req.params.id }),
      post.deleteOne(),
    ]);

    // 清除相关缓存
    cache.invalidatePattern('^feed:');
    cache.invalidatePattern('^posts:user:' + req.user.id);
    cache.invalidatePattern('^post:' + req.params.id);
    success(res, null, '已删除');
  } catch (err) {
    logger.error('[postController.deletePost]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取帖子详情
 * @param {string} req.params.id - 帖子 ID
 * @returns {object} - 帖子详情（包含点赞和收藏状态）
 */
exports.getPostById = async (req, res) => {
  try {
    const cacheKey = 'post:' + req.params.id;
    let postData = cache.get(cacheKey);
    if (!postData) {
      const post = await Post.findById(req.params.id);
      if (!post) return fail(res, '帖子不存在', 1, 404);

      // 获取帖子用户信息（可缓存部分）
      const result = await attachPostUsers([post]);
      postData = result[0];
      cache.set(cacheKey, postData, 30000);
    }

    // 用户特定的状态（点赞/收藏）不缓存，每次单独查询
    const [likes, bookmarks] = await Promise.all([
      Like.findOne({ user: req.user.id, post: req.params.id }),
      Bookmark.findOne({ user: req.user.id, post: req.params.id }),
    ]);

    // 返回时合并用户特定状态
    const response = {
      ...postData.toObject ? postData.toObject() : postData,
      liked: !!likes,
      bookmarked: !!bookmarks,
    };

    success(res, response);
  } catch (err) {
    logger.error('[postController.getPostById]', { error: err.message, stack: err.stack });
    error(res);
  }
};
