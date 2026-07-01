/**
 * 验证中间件
 * 
 * 功能：
 * - 使用 express-validator 验证请求数据
 * - 收集所有验证错误
 * - 返回格式化的错误消息
 * 
 * 使用方式：
 *   const { body, param } = require('express-validator');
 *   
 *   router.post('/posts', 
 *     validate([
 *       body('content').notEmpty().withMessage('内容不能为空'),
 *       body('title').isLength({ max: 100 }).withMessage('标题最长100字符'),
 *     ]),
 *     controller.createPost
 *   );
 */

const { validationResult } = require('express-validator');

/**
 * 创建验证中间件
 * @param {Array} rules - express-validator 验证规则数组
 * @returns {Array} - 包含验证规则和验证处理的中间件数组
 */
module.exports = function validate(rules) {
  return [
    // 展开验证规则
    ...rules,
    
    // 验证处理中间件
    (req, res, next) => {
      // 获取验证结果
      const errors = validationResult(req);
      
      // 如果有验证错误
      if (!errors.isEmpty()) {
        // 将所有错误消息拼接在一起
        const msg = errors.array().map(e => e.msg).join('；');
        
        return res.status(400).json({ 
          code: 1, 
          data: null, 
          msg 
        });
      }
      
      // 验证通过，继续处理
      next();
    },
  ];
};
