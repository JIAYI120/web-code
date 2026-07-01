/**
 * 帖子路由
 * 
 * 功能：
 * - 帖子的增删改查
 * - 帖子列表（动态流、朋友动态、用户帖子）
 * - 帖子搜索
 * - 草稿管理
 * 
 * 路由列表：
 * - GET /api/posts/drafts - 获取草稿列表（需要登录）
 * - POST /api/posts/drafts - 创建草稿（需要登录，内容审核）
 * - PUT /api/posts/drafts/:id - 更新草稿（需要登录，内容审核）
 * - DELETE /api/posts/drafts/:id - 删除草稿（需要登录）
 * - GET /api/posts/mine - 获取我的帖子（需要登录）
 * - GET /api/posts/feed - 获取动态流（需要登录）
 * - GET /api/posts/search - 搜索帖子（需要登录）
 * - GET /api/posts/friends - 获取朋友动态（需要登录）
 * - GET /api/posts/count - 获取帖子数量（需要登录）
 * - GET /api/posts/user/:userId - 获取用户帖子（需要登录）
 * - POST /api/posts - 创建帖子（需要登录，内容审核）
 * - DELETE /api/posts/:id - 删除帖子（需要登录）
 * - GET /api/posts/:id - 获取帖子详情（需要登录）
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { validateContent } = require('../middleware/contentFilter');
const postController = require('../controllers/postController');
const postValidator = require('../validators/postValidator');

// 获取草稿列表
router.get('/drafts', auth, asyncHandler(postController.getDrafts));
// 创建草稿
router.post('/drafts', auth, validateContent, validate(postValidator.createDraft), asyncHandler(postController.createDraft));
// 更新草稿
router.put('/drafts/:id', auth, validateContent, validate([...postValidator.updateDraft, ...postValidator.draftIdParam]), asyncHandler(postController.updateDraft));
// 删除草稿
router.delete('/drafts/:id', auth, validate(postValidator.draftIdParam), asyncHandler(postController.deleteDraft));
// 获取我的帖子
router.get('/mine', auth, asyncHandler(postController.getMyPosts));
// 获取动态流
router.get('/feed', auth, asyncHandler(postController.getFeed));
// 获取随机帖子
router.get('/random', auth, asyncHandler(postController.getRandomPost));
// 搜索帖子
router.get('/search', auth, validate(postValidator.search), asyncHandler(postController.searchPosts));
// 获取朋友动态
router.get('/friends', auth, asyncHandler(postController.getFriendsPosts));
// 获取帖子数量
router.get('/count', auth, asyncHandler(postController.getPostCount));
// 获取用户帖子
router.get('/user/:userId', auth, asyncHandler(postController.getUserPosts));
// 创建帖子
router.post('/', auth, validateContent, validate(postValidator.createPost), asyncHandler(postController.createPost));
// 删除帖子
router.delete('/:id', auth, validate(postValidator.postIdParam), asyncHandler(postController.deletePost));
// 获取帖子详情
router.get('/:id', auth, validate(postValidator.postIdParam), asyncHandler(postController.getPostById));

module.exports = router;
