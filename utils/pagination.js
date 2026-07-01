/**
 * 分页工具
 * 
 * 功能：
 * - 解析分页参数
 * - 生成分页结果
 * 
 * 使用方式：
 *   const { parsePagination, paginationResult } = require('../utils/pagination');
 *   
 *   // 解析分页参数
 *   const { page, pageSize, skip } = parsePagination(req.query);
 *   
 *   // 查询数据库
 *   const [data, total] = await Promise.all([
 *     Model.find().skip(skip).limit(pageSize),
 *     Model.countDocuments(),
 *   ]);
 *   
 *   // 返回分页结果
 *   res.json(paginationResult(data, total, { page, pageSize }));
 */

/**
 * 解析分页参数
 * @param {object} query - 请求查询参数
 * @param {object} defaults - 默认值
 * @returns {object} - { page, pageSize, skip }
 */
function parsePagination(query, defaults = {}) {
  // 页码（最小 1）
  const page = Math.max(1, Number(query.page) || defaults.page || 1);
  
  // 每页数量（最小 1，最大 50）
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || defaults.pageSize || 20));
  
  // 跳过数量
  const skip = (page - 1) * pageSize;
  
  return { page, pageSize, skip };
}

/**
 * 生成分页结果
 * @param {Array} data - 数据列表
 * @param {number} total - 总数量
 * @param {object} options - 分页选项
 * @returns {object} - 分页结果
 */
function paginationResult(data, total, { page, pageSize }) {
  return {
    list: data,
    pagination: {
      page,           // 当前页码
      pageSize,       // 每页数量
      total,          // 总数量
      totalPages: Math.ceil(total / pageSize),  // 总页数
      hasMore: page * pageSize < total,         // 是否有更多
    },
  };
}

module.exports = { parsePagination, paginationResult };
