/**
 * 响应工具
 * 
 * 功能：
 * - 统一的 API 响应格式
 * - 标准化的错误响应
 * 
 * 响应格式：
 * {
 *   code: 0,      // 0=成功, 1=业务错误, -1=系统错误, 401/403/404=HTTP 错误
 *   data: any,    // 响应数据
 *   msg: string   // 响应消息
 * }
 */

module.exports = {
  /**
   * 成功响应
   * @param {object} res - Express 响应对象
   * @param {*} data - 响应数据
   * @param {string} msg - 响应消息
   */
  success(res, data = null, msg = 'ok') {
    res.json({ code: 0, data, msg });
  },

  /**
   * 业务失败响应
   * @param {object} res - Express 响应对象
   * @param {string} msg - 错误消息
   * @param {number} code - 错误代码
   * @param {number} status - HTTP 状态码
   */
  fail(res, msg = '操作失败', code = 1, status = 400) {
    res.status(status).json({ code, data: null, msg });
  },

  /**
   * 系统错误响应
   * @param {object} res - Express 响应对象
   * @param {string} msg - 错误消息
   */
  error(res, msg = '服务器内部错误') {
    res.status(500).json({ code: -1, data: null, msg });
  },

  /**
   * 未认证响应
   * @param {object} res - Express 响应对象
   * @param {string} msg - 错误消息
   */
  unauthorized(res, msg = '未登录或登录已过期') {
    res.status(401).json({ code: 401, data: null, msg });
  },

  /**
   * 无权限响应
   * @param {object} res - Express 响应对象
   * @param {string} msg - 错误消息
   */
  forbidden(res, msg = '无权限') {
    res.status(403).json({ code: 403, data: null, msg });
  },

  /**
   * 资源不存在响应
   * @param {object} res - Express 响应对象
   * @param {string} msg - 错误消息
   */
  notFound(res, msg = '资源不存在') {
    res.status(404).json({ code: 404, data: null, msg });
  },
};
