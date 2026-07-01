/**
 * 评论控制器
 * 
 * 功能：
 * - 创建评论（支持二级评论）
 * - 获取评论列表（包含回复）
 * - 获取回复列表
 * - 删除评论
 * 
 * API 接口：
 * - POST /api/comments/:postId - 创建评论
 * - GET /api/comments/:postId - 获取评论列表
 * - GET /api/comments/:commentId/replies - 获取回复列表
 * - DELETE /api/comments/:id - 删除评论
 */

const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Profile = require('../models/Profile');
const User = require('../models/User');
const InteractionNotification = require('../models/InteractionNotification');
const { createInteractionNotification, deleteInteractionNotification } = require('../utils/interactionNotifications');
const { success, fail, error } = require('../utils/response');
const { parsePagination, paginationResult } = require('../utils/pagination');
const cache = require('../utils/cache');
const { logger } = require('../utils/logger');

/**
 * 创建评论
 * @param {string} req.params.postId - 帖子 ID
 * @param {string} req.body.content - 评论内容
 * @param {string} req.body.parentId - 父评论 ID（可选，用于二级评论）
 * @param {string} req.body.replyToId - 被回复用户 ID（可选）
 * @returns {object} - 创建的评论
 */
exports.createComment = async (req, res) => {
  try {
    const { content, parentId, replyToId } = req.body;
    const commentData = {
      user: req.user.id,
      post: req.params.postId,
      content: content.trim(),
    };

    // 二级评论处理
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) return fail(res, '父评论不存在', 1, 404);
      if (parentComment.post.toString() !== req.params.postId) {
        return fail(res, '父评论不属于该帖子', 1, 400);
      }
      commentData.parent = parentId;
      commentData.replyTo = replyToId || parentComment.user;
    }

    // 创建评论
    const comment = new Comment(commentData);
    await comment.save();

    // 更新帖子评论数
    const post = await Post.findByIdAndUpdate(
      req.params.postId, 
      { $inc: { commentCount: 1 } }, 
      { new: true }
    ).select('user');

    // 创建互动通知
    if (post) {
      const recipient = commentData.replyTo || post.user;
      if (recipient.toString() !== req.user.id) {
        await createInteractionNotification({
          recipient,
          actor: req.user.id,
          type: 'comment',
          post: post._id,
          comment: comment._id,
          content: comment.content,
        });
      }
    }

    // 获取用户信息
    const [profile, user] = await Promise.all([
      Profile.findOne({ user: req.user.id }),
      User.findById(req.user.id).select('name'),
    ]);
    const replyToProfile = commentData.replyTo 
      ? await Profile.findOne({ user: commentData.replyTo }) 
      : null;
    const replyToUser = commentData.replyTo 
      ? await User.findById(commentData.replyTo).select('name') 
      : null;

    // 清除缓存
    cache.invalidatePattern('^comments:' + req.params.postId);
    cache.del('post:' + req.params.postId);

    success(res, {
      ...comment.toObject(),
      nickname: profile?.nickname || user?.name || '',
      identity: profile?.identity || '学生',
      replyToNickname: replyToProfile?.nickname || replyToUser?.name || '',
    });
  } catch (err) {
    logger.error('[commentController.createComment]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取评论列表（一级评论，包含前3条回复）
 * @param {string} req.params.postId - 帖子 ID
 * @param {number} req.query.page - 页码
 * @param {number} req.query.pageSize - 每页数量
 * @returns {object} - 分页后的评论列表
 */
exports.getComments = async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const cacheKey = 'comments:' + req.params.postId + ':' + page + ':' + pageSize;
    let result = cache.get(cacheKey);

    if (!result) {
      // 只查询一级评论（parent 为 null）
      const filter = { post: req.params.postId, parent: null };
      const [comments, total, post] = await Promise.all([
        Comment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
        Comment.countDocuments(filter),
        Post.findById(req.params.postId).select('user'),
      ]);

      // 获取每条评论的前3条回复
      const commentIds = comments.map(c => c._id);
      const replies = await Comment.find({ parent: { $in: commentIds } })
        .sort({ createdAt: 1 })
        .limit(3);

      // 收集所有用户 ID
      const allUserIds = [
        ...comments.map(c => c.user.toString()),
        ...replies.map(r => r.user.toString()),
        ...replies.filter(r => r.replyTo).map(r => r.replyTo.toString()),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];

      // 获取用户信息
      const [profiles, users] = await Promise.all([
        Profile.find({ user: { $in: uniqueUserIds } }),
        User.find({ _id: { $in: uniqueUserIds } }).select('name'),
      ]);

      const profileMap = {};
      profiles.forEach(p => { profileMap[p.user.toString()] = p; });
      const userMap = {};
      users.forEach(u => { userMap[u._id.toString()] = u; });

      const getUserInfo = (uid) => ({
        nickname: profileMap[uid]?.nickname || userMap[uid]?.name || '',
        identity: profileMap[uid]?.identity || '学生',
      });

      // 按父评论分组回复
      const repliesByParent = {};
      replies.forEach(r => {
        const parentId = r.parent.toString();
        if (!repliesByParent[parentId]) repliesByParent[parentId] = [];
        const uid = r.user.toString();
        const replyToUid = r.replyTo?.toString();
        repliesByParent[parentId].push({
          ...r.toObject(),
          ...getUserInfo(uid),
          replyToNickname: replyToUid ? getUserInfo(replyToUid).nickname : '',
          canDelete: r.user.toString() === req.user.id || post?.user?.toString() === req.user.id,
        });
      });

      // 统计每条评论的回复数
      const replyCounts = await Comment.aggregate([
        { $match: { parent: { $in: commentIds } } },
        { $group: { _id: '$parent', count: { $sum: 1 } } },
      ]);
      const replyCountMap = {};
      replyCounts.forEach(r => { replyCountMap[r._id.toString()] = r.count; });

      // 构建评论列表
      const list = comments.map(c => {
        const uid = c.user.toString();
        return {
          ...c.toObject(),
          ...getUserInfo(uid),
          canDelete: c.user.toString() === req.user.id || post?.user?.toString() === req.user.id,
          replies: repliesByParent[c._id.toString()] || [],
          replyCount: replyCountMap[c._id.toString()] || 0,
        };
      });

      result = paginationResult(list, total, { page, pageSize });
      cache.set(cacheKey, result, 15000);
    }
    success(res, result);
  } catch (err) {
    logger.error('[commentController.getComments]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取回复列表
 * @param {string} req.params.commentId - 父评论 ID
 * @param {number} req.query.page - 页码
 * @param {number} req.query.pageSize - 每页数量
 * @returns {object} - 分页后的回复列表
 */
exports.getReplies = async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const filter = { parent: req.params.commentId };
    const [replies, total] = await Promise.all([
      Comment.find(filter).sort({ createdAt: 1 }).skip(skip).limit(pageSize),
      Comment.countDocuments(filter),
    ]);

    // 收集用户 ID
    const userIds = [
      ...replies.map(r => r.user.toString()),
      ...replies.filter(r => r.replyTo).map(r => r.replyTo.toString()),
    ];
    const uniqueUserIds = [...new Set(userIds)];

    // 获取用户信息
    const [profiles, users] = await Promise.all([
      Profile.find({ user: { $in: uniqueUserIds } }),
      User.find({ _id: { $in: uniqueUserIds } }).select('name'),
    ]);

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // 通过父评论获取帖子信息
    const parentComment = await Comment.findById(req.params.commentId).select('post');
    const post = parentComment ? await Post.findById(parentComment.post).select('user') : null;

    const list = replies.map(r => {
      const uid = r.user.toString();
      const replyToUid = r.replyTo?.toString();
      return {
        ...r.toObject(),
        nickname: profileMap[uid]?.nickname || userMap[uid]?.name || '',
        identity: profileMap[uid]?.identity || '学生',
        replyToNickname: replyToUid 
          ? (profileMap[replyToUid]?.nickname || userMap[replyToUid]?.name || '') 
          : '',
        canDelete: r.user.toString() === req.user.id || post?.user?.toString() === req.user.id,
      };
    });

    success(res, paginationResult(list, total, { page, pageSize }));
  } catch (err) {
    logger.error('[commentController.getReplies]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 删除评论
 * @param {string} req.params.id - 评论 ID
 * @returns {object} - 删除成功消息
 */
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return fail(res, '评论不存在', 1, 404);

    const post = await Post.findById(comment.post).select('user commentCount');
    const canDelete = comment.user.toString() === req.user.id || post?.user?.toString() === req.user.id;
    if (!canDelete) return fail(res, '无权删除', 1, 403);

    // 统计子评论数量
    const deleteCount = await Comment.countDocuments({ parent: comment._id });
    
    // 删除子评论和自身
    await Comment.deleteMany({ parent: comment._id });
    await comment.deleteOne();

    // 更新帖子评论数
    if (post) {
      post.commentCount = Math.max(0, (post.commentCount || 0) - 1 - deleteCount);
      await post.save();
    }

    // 删除互动通知
    if (post?.user) {
      await deleteInteractionNotification({
        recipient: post.user,
        actor: comment.user,
        type: 'comment',
        comment: comment._id,
      });
    }
    await InteractionNotification.deleteMany({ comment: comment._id });

    // 清除缓存
    cache.invalidatePattern('^comments:' + comment.post);
    cache.del('post:' + comment.post);

    success(res, null, '已删除');
  } catch (err) {
    logger.error('[commentController.deleteComment]', { error: err.message, stack: err.stack });
    error(res);
  }
};
