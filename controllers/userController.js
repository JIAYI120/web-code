/**
 * 用户控制器
 * 
 * 功能：
 * - 用户注册和登录
 * - 用户信息查询
 * - 用户搜索
 * - 个人资料更新
 * 
 * API 接口：
 * - POST /api/users/register - 用户注册
 * - POST /api/users/login - 用户登录
 * - GET /api/users/me - 获取当前用户信息
 * - GET /api/users/search?q=keyword - 搜索用户
 * - PUT /api/users/profile - 更新个人资料
 * - GET /api/users/:id/profile - 获取指定用户资料
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const { success, fail, error } = require('../utils/response');
const cache = require('../utils/cache');
const { logger } = require('../utils/logger');

/**
 * 用户注册
 * @param {string} req.body.name - 用户名
 * @param {string} req.body.password - 密码
 * @returns {object} - 包含 JWT 令牌的响应
 */
exports.register = async (req, res) => {
  try {
    const { name, password } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return fail(res, '用户名已存在');
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建用户
    const user = new User({ name, password: hashedPassword });
    await user.save();

    // 创建默认个人资料
    await Profile.create({ user: user._id, nickname: name });

    // 生成 JWT 令牌
    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    success(res, { token });
  } catch (err) {
    logger.error('[userController.register]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 用户登录
 * @param {string} req.body.name - 用户名
 * @param {string} req.body.password - 密码
 * @returns {object} - 包含 JWT 令牌的响应
 */
exports.login = async (req, res) => {
  try {
    const { name, password } = req.body;

    // 查找用户
    const user = await User.findOne({ name });
    if (!user) {
      return fail(res, '用户名或密码错误');
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return fail(res, '用户名或密码错误');
    }

    // 生成 JWT 令牌
    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    success(res, { token });
  } catch (err) {
    logger.error('[userController.login]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取当前用户信息
 * @returns {object} - 用户信息（不包含密码）
 */
exports.getMe = async (req, res) => {
  try {
    const cacheKey = 'user:' + req.user.id;
    let userData = cache.get(cacheKey);
    
    if (!userData) {
      const user = await User.findById(req.user.id).select('-password');
      const profile = await Profile.findOne({ user: req.user.id });
      
      userData = {
        ...user.toObject(),
        nickname: profile?.nickname || user.name || '',
        identity: profile?.identity || '学生',
        bio: profile?.bio || '用文字记录校园生活的每一刻',
        gender: profile?.gender || '',
        birthday: profile?.birthday || '',
        location: profile?.location || '',
      };
      
      // 缓存 60 秒
      cache.set(cacheKey, userData, 60000);
    }
    
    success(res, userData);
  } catch (err) {
    logger.error('[userController.getMe]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 搜索用户
 * @param {string} req.query.q - 搜索关键词
 * @returns {Array} - 匹配的用户列表
 */
exports.search = async (req, res) => {
  try {
    const keyword = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!keyword) {
      return success(res, []);
    }

    const cacheKey = 'search:user:' + keyword;
    let results = cache.get(cacheKey);
    
    if (!results) {
      // 转义正则特殊字符
      const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeKeyword, 'i');

      // 同时搜索 Profile 和 User 表
      const [profiles, users] = await Promise.all([
        Profile.find({ nickname: regex }).limit(20),
        User.find({ name: regex }).select('name').limit(20),
      ]);

      // 合并结果，去重
      const profileUserIds = profiles.map(item => item.user.toString());
      const matchedUsers = users.filter(item => !profileUserIds.includes(item._id.toString()));
      const extraUserIds = matchedUsers.map(item => item._id.toString());

      // 获取额外用户的 Profile
      const extraProfiles = extraUserIds.length
        ? await Profile.find({ user: { $in: extraUserIds } })
        : [];

      // 构建查找映射
      const userMap = users.reduce((map, item) => {
        map[item._id.toString()] = item;
        return map;
      }, {});
      const profileMap = extraProfiles.reduce((map, item) => {
        map[item.user.toString()] = item;
        return map;
      }, {});

      // 构建搜索结果
      const profileResults = profiles.map(profile => {
        const uid = profile.user.toString();
        const user = userMap[uid];
        return {
          _id: uid,
          username: user?.name || '',
          nickname: profile.nickname || user?.name || '',
          identity: profile.identity || '学生',
          bio: profile.bio || '这个人很低调，暂时没有填写简介',
        };
      });

      const userResults = matchedUsers.map(item => {
        const profile = profileMap[item._id.toString()];
        return {
          _id: item._id.toString(),
          username: item.name || '',
          nickname: profile?.nickname || item.name || '',
          identity: profile?.identity || '学生',
          bio: profile?.bio || '这个人很低调，暂时没有填写简介',
        };
      });

      results = [...profileResults, ...userResults].slice(0, 20);
      
      // 缓存 30 秒
      cache.set(cacheKey, results, 30000);
    }

    success(res, results);
  } catch (err) {
    logger.error('[userController.search]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 更新个人资料
 * @param {string} req.body.nickname - 昵称
 * @param {string} req.body.identity - 身份
 * @param {string} req.body.bio - 简介
 * @param {string} req.body.gender - 性别
 * @param {string} req.body.birthday - 生日
 * @param {string} req.body.location - 所在地
 * @returns {object} - 更新后的用户信息
 */
exports.updateProfile = async (req, res) => {
  try {
    const { nickname, identity, bio, gender, birthday, location } = req.body;
    
    // 查找或创建 Profile
    let profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      profile = new Profile({ user: req.user.id });
    }
    
    // 更新字段
    if (nickname !== undefined) profile.nickname = nickname;
    if (identity !== undefined) profile.identity = identity;
    if (bio !== undefined) profile.bio = bio;
    if (gender !== undefined) profile.gender = gender;
    if (birthday !== undefined) profile.birthday = birthday;
    if (location !== undefined) profile.location = location;
    
    await profile.save();

    // 清除缓存
    cache.del('user:' + req.user.id);
    cache.invalidatePattern('^search:user:');

    // 返回更新后的用户信息
    const user = await User.findById(req.user.id).select('-password');
    success(res, {
      ...user.toObject(),
      nickname: profile?.nickname || user.name || '',
      identity: profile?.identity || '学生',
      bio: profile?.bio || '用文字记录校园生活的每一刻',
      gender: profile?.gender || '',
      birthday: profile?.birthday || '',
      location: profile?.location || '',
    });
  } catch (err) {
    logger.error('[userController.updateProfile]', { error: err.message, stack: err.stack });
    error(res);
  }
};

/**
 * 获取指定用户资料
 * @param {string} req.params.id - 用户 ID
 * @returns {object} - 用户资料（包含帖子数、关注数、粉丝数）
 */
exports.getUserProfile = async (req, res) => {
  try {
    const cacheKey = 'profile:' + req.params.id;
    let profileData = cache.get(cacheKey);
    
    if (!profileData) {
      const user = await User.findById(req.params.id).select('name');
      if (!user) {
        return fail(res, '用户不存在', 1, 404);
      }

      // 并行查询用户统计数据
      const [profile, postCount, followingCount, fansCount, isFollowing, isFollowedBy] = await Promise.all([
        Profile.findOne({ user: req.params.id }),
        Post.countDocuments({ user: req.params.id }),
        Follow.countDocuments({ follower: req.params.id }),
        Follow.countDocuments({ following: req.params.id }),
        Follow.findOne({ follower: req.user.id, following: req.params.id }),
        Follow.findOne({ follower: req.params.id, following: req.user.id }),
      ]);

      profileData = {
        _id: user._id,
        name: user.name,
        nickname: profile?.nickname || user.name || '',
        identity: profile?.identity || '学生',
        bio: profile?.bio || '用文字记录校园生活的每一刻',
        gender: profile?.gender || '',
        birthday: profile?.birthday || '',
        location: profile?.location || '',
        postCount,
        followingCount,
        fansCount,
        isFollowing: !!isFollowing,
        isFollowedBy: !!isFollowedBy,
        isMutual: !!isFollowing && !!isFollowedBy,
      };
      
      // 缓存 30 秒
      cache.set(cacheKey, profileData, 30000);
    }

    success(res, profileData);
  } catch (err) {
    logger.error('[userController.getUserProfile]', { error: err.message, stack: err.stack });
    error(res);
  }
};
