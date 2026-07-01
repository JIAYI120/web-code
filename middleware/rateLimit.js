/**
 * 限流中间件
 * 
 * 功能：
 * - 防止 API 被滥用
 * - 保护服务器资源
 * - 防止暴力破解攻击
 * 
 * 限流策略：
 * - apiLimiter: 全局 API 限流（200次/分钟）
 * - aiLimiter: AI 接口限流（20次/分钟）
 * - authLimiter: 登录注册限流（50次/5分钟）
 */

const rateLimit = require('express-rate-limit');

/**
 * 全局 API 限流
 * 适用于所有 /api 路由
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 分钟窗口
  max: 200,                    // 每个 IP 最多 200 次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 1, data: null, msg: '请求过于频繁，请稍后再试' },
});

/**
 * AI 接口限流
 * AI 接口消耗资源较多，需要更严格的限流
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 分钟窗口
  max: 20,                     // 每个 IP 最多 20 次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 1, data: null, msg: 'AI 对话请求过于频繁，请稍后再试' },
});

/**
 * 登录注册限流
 * 防止暴力破解密码
 */
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,   // 5 分钟窗口
  max: 50,                     // 每个 IP 最多 50 次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 1, data: null, msg: '登录尝试过于频繁，请稍后再试' },
});

module.exports = { apiLimiter, aiLimiter, authLimiter };
