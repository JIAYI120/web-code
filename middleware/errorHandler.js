/**
 * 错误处理中间件
 * 
 * 功能：
 * - 捕获并处理所有未处理的错误
 * - 根据错误类型返回相应的错误响应
 * - 记录错误日志
 * 
 * 支持的错误类型：
 * - ValidationError: 数据验证失败
 * - CastError: 无效的 ID 格式
 * - 11000: 数据重复（唯一索引冲突）
 * - SyntaxError: 请求体格式错误
 * - LIMIT_FILE_SIZE: 文件大小超出限制
 * - CORS: 跨域请求被拒绝
 */

const { logger } = require('../utils/logger');

module.exports = function (err, req, res, _next) {
  // 记录错误日志
  logger.error('[ErrorHandler]', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id,
  });

  // 数据验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      code: 1, 
      data: null, 
      msg: '参数验证失败: ' + err.message 
    });
  }

  // ID 格式错误
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      code: 1, 
      data: null, 
      msg: '无效的ID格式' 
    });
  }

  // 唯一索引冲突（数据重复）
  if (err.code === 11000) {
    return res.status(400).json({ 
      code: 1, 
      data: null, 
      msg: '数据重复' 
    });
  }

  // JSON 解析错误
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ 
      code: 1, 
      data: null, 
      msg: '请求体格式错误' 
    });
  }

  // 文件大小超出限制
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      code: 1, 
      data: null, 
      msg: '文件大小超出限制' 
    });
  }

  // 意外的文件字段
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ 
      code: 1, 
      data: null, 
      msg: '意外的文件字段' 
    });
  }

  // CORS 错误
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ 
      code: 1, 
      data: null, 
      msg: '跨域请求被拒绝' 
    });
  }

  // 其他错误
  const status = err.status || err.statusCode || 500;
  const msg = status === 500 ? '服务器内部错误' : err.message;

  res.status(status).json({ code: -1, data: null, msg });
};
