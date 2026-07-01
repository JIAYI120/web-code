/**
 * 认证中间件
 * 
 * 功能：
 * - 从请求头 x-auth-token 中提取 JWT 令牌
 * - 验证令牌的有效性和过期时间
 * - 解码后的用户信息挂载到 req.user 上
 * 
 * 使用方式：
 *   router.get('/protected', auth, controller.method);
 * 
 * 请求头格式：
 *   x-auth-token: <jwt_token>
 */

const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response');

module.exports = function (req, res, next) {
  // 从请求头获取令牌
  const token = req.header('x-auth-token');

  // 令牌不存在
  if (!token) {
    return unauthorized(res, '未提供认证令牌');
  }

  try {
    // 验证并解码令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 将用户信息挂载到请求对象上
    // decoded.user 的结构: { id: userId }
    req.user = decoded.user;
    
    next();
  } catch (err) {
    return unauthorized(res, '令牌无效或已过期');
  }
};
