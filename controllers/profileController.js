/**
 * 个人资料控制器
 * 
 * 功能：
 * - 获取当前用户的个人资料
 * - 更新个人资料
 * 
 * API 接口：
 * - GET /api/profile - 获取个人资料
 * - PUT /api/profile - 更新个人资料
 */

const Profile = require('../models/Profile');
const { success, error } = require('../utils/response');
const { logger } = require('../utils/logger');

/**
 * 获取个人资料
 * @returns {object} - 个人资料
 */
exports.getProfile = async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      profile = await Profile.create({ user: req.user.id });
    }
    success(res, profile);
  } catch (err) {
    logger.error('[profileController]', { error: err.message, stack: err.stack });
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
 * @returns {object} - 更新后的个人资料
 */
exports.updateProfile = async (req, res) => {
  try {
    const { nickname, identity, bio, gender, birthday, location } = req.body;
    const fields = { nickname, identity, bio, gender, birthday, location };

    let profile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      { $set: fields },
      { new: true, upsert: true }
    );
    success(res, profile);
  } catch (err) {
    logger.error('[profileController]', { error: err.message, stack: err.stack });
    error(res);
  }
};
