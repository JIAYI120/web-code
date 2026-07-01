/**
 * 用户验证器
 * 
 * 功能：
 * - 验证用户相关请求参数
 * 
 * 验证规则：
 * - register: 用户注册
 *   - name: 用户名，2-20 字符
 *   - password: 密码，6-50 字符
 * - login: 用户登录
 *   - name: 用户名
 *   - password: 密码
 * - updateProfile: 更新个人资料
 *   - nickname: 昵称（可选，最长 30 字符）
 *   - identity: 身份（可选，最长 20 字符）
 *   - bio: 个人简介（可选，最长 200 字符）
 *   - gender: 性别（可选，男/女/空）
 *   - birthday: 生日（可选）
 *   - location: 所在地（可选，最长 50 字符）
 * - search: 搜索用户
 *   - q: 搜索关键词（可选，最长 50 字符）
 */

const { body, query, param } = require('express-validator');

// 用户注册验证规则
exports.register = [
  body('name')
    .trim()
    .notEmpty().withMessage('用户名不能为空')
    .isLength({ min: 2, max: 20 }).withMessage('用户名长度为2-20个字符'),
  body('password')
    .notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6, max: 50 }).withMessage('密码长度为6-50个字符'),
];

// 用户登录验证规则
exports.login = [
  body('name').trim().notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空'),
];

// 更新个人资料验证规则
exports.updateProfile = [
  body('nickname').optional().trim().isLength({ max: 30 }).withMessage('昵称最长30个字符'),
  body('identity').optional().trim().isLength({ max: 20 }).withMessage('身份最长20个字符'),
  body('bio').optional().trim().isLength({ max: 200 }).withMessage('简介最长200个字符'),
  body('gender').optional().trim().isIn(['男', '女', '']).withMessage('性别格式不正确'),
  body('birthday').optional().trim(),
  body('location').optional().trim().isLength({ max: 50 }).withMessage('地区最长50个字符'),
];

// 搜索用户验证规则
exports.search = [
  query('q').optional().trim().isLength({ max: 50 }).withMessage('搜索关键词最长50个字符'),
];

// 用户 ID 参数验证
exports.userIdParam = [
  param('id').isMongoId().withMessage('无效的用户ID'),
];
