/**
 * 缓存工具
 * 
 * 功能：
 * - 基于内存的键值缓存
 * - 支持 TTL（过期时间）
 * - 支持按模式批量失效
 * - 自动限制最大缓存条目数（LRU 淘汰）
 * 
 * 使用方式：
 *   const cache = require('../utils/cache');
 *   
 *   // 设置缓存（默认 60 秒过期）
 *   cache.set('key', value);
 *   
 *   // 设置缓存（自定义过期时间）
 *   cache.set('key', value, 30000);  // 30 秒
 *   
 *   // 获取缓存
 *   const value = cache.get('key');
 *   
 *   // 删除缓存
 *   cache.del('key');
 *   
 *   // 按模式删除
 *   cache.invalidatePattern('^user:');
 * 
 * 注意事项：
 * - 这是进程内缓存，重启后丢失
 * - 多实例部署时缓存不共享
 * - 生产环境建议使用 Redis
 */

const MAX_CACHE_SIZE = 10000;

// 缓存数据存储
const cache = new Map();

// TTL 过期时间存储
const ttlMap = new Map();

/**
 * 设置缓存
 * @param {string} key - 缓存键
 * @param {*} value - 缓存值
 * @param {number} ttlMs - 过期时间（毫秒），默认 60000
 */
function set(key, value, ttlMs = 60000) {
  // 如果缓存已满，删除最早添加的条目（FIFO）
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
    ttlMap.delete(firstKey);
  }
  
  cache.set(key, value);
  ttlMap.set(key, Date.now() + ttlMs);
}

/**
 * 获取缓存
 * @param {string} key - 缓存键
 * @returns {*} - 缓存值，如果不存在或已过期返回 null
 */
function get(key) {
  const ttl = ttlMap.get(key);
  
  // 检查是否过期
  if (!ttl || Date.now() > ttl) {
    cache.delete(key);
    ttlMap.delete(key);
    return null;
  }
  
  return cache.get(key);
}

/**
 * 删除缓存
 * @param {string} key - 缓存键
 */
function del(key) {
  cache.delete(key);
  ttlMap.delete(key);
}

/**
 * 清空所有缓存
 */
function clear() {
  cache.clear();
  ttlMap.clear();
}

/**
 * 按模式批量失效
 * @param {string} pattern - 正则表达式模式
 */
function invalidatePattern(pattern) {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      del(key);
    }
  }
}

/**
 * 获取缓存条目数
 * @returns {number} - 缓存条目数
 */
function size() {
  return cache.size;
}

module.exports = { set, get, del, clear, invalidatePattern, size };
