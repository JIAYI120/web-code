/**
 * 日志工具
 * 
 * 功能：
 * - 结构化日志记录
 * - 自动清理过期日志（1小时）
 * - 只记录 error 级别
 * 
 * 日志文件：
 * - logs/error.log: 错误日志
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 日志目录
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * 清理过期日志（1小时前）
 */
function cleanOldLogs() {
  const maxAge = 60 * 60 * 1000; // 1小时
  const now = Date.now();
  
  try {
    const files = fs.readdirSync(logsDir);
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAge) {
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkErr) {
            // 文件可能被锁定（Windows上的EPERM错误），跳过
            if (unlinkErr.code !== 'EPERM') {
              console.error(`Failed to delete log file ${file}:`, unlinkErr.message);
            }
          }
        }
      } catch (statErr) {
        // 文件可能被锁定，跳过
        if (statErr.code !== 'EPERM') {
          console.error(`Failed to stat log file ${file}:`, statErr.message);
        }
      }
    });
  } catch (err) {
    console.error('Failed to clean old logs:', err.message);
  }
}

// 启动时清理一次
cleanOldLogs();

// 每10分钟清理一次
setInterval(cleanOldLogs, 10 * 60 * 1000);

// 创建日志实例
const logger = winston.createLogger({
  level: 'warn', // 记录 warn 及以上级别
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'xiaoyuan-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 1024 * 1024, // 1MB
      maxFiles: 1,          // 只保留1个文件
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'warn.log'),
      level: 'warn',
      maxsize: 1024 * 1024, // 1MB
      maxFiles: 1,          // 只保留1个文件
    }),
  ],
});

// 开发环境输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * 请求日志中间件
 * 只记录失败的请求（4xx, 5xx）
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // 只记录失败的请求
    if (res.statusCode >= 400) {
      logger.error('Request failed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: duration + 'ms',
        ip: req.ip,
        userId: req.user?.id,
      });
    }
  });

  next();
};

module.exports = { logger, requestLogger };
