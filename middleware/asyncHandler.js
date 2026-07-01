/**
 * 异步处理包装器
 * 
 * 功能：
 * - 包装异步路由处理函数
 * - 自动捕获 Promise 拒绝
 * - 将错误传递给 Express 错误处理中间件
 * 
 * 使用方式：
 *   const asyncHandler = require('../middleware/asyncHandler');
 *   
 *   router.get('/posts', asyncHandler(async (req, res) => {
 *     const posts = await Post.find();
 *     res.json(posts);
 *   }));
 * 
 * 优势：
 * - 避免每个控制器都写 try-catch
 * - 统一错误处理
 * - 代码更简洁
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
