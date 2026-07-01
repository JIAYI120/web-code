/**
 * 时间辅助工具
 * 
 * 功能：
 * - formatMessageTime: 格式化消息时间
 */

/**
 * 格式化消息时间
 * @param {Date|string} date - 日期对象或字符串
 * @returns {string} - 格式化后的时间字符串
 * 
 * 规则：
 * - 今天：显示 HH:mm
 * - 今年：显示 MM-DD HH:mm
 * - 其他：显示 YYYY-MM-DD
 */
function formatMessageTime(date) {
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return '';

  const now = new Date();
  const sameYear = now.getFullYear() === target.getFullYear();
  const sameDay = sameYear && now.getMonth() === target.getMonth() && now.getDate() === target.getDate();

  const hour = String(target.getHours()).padStart(2, '0');
  const minute = String(target.getMinutes()).padStart(2, '0');

  // 今天
  if (sameDay) return hour + ':' + minute;

  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');

  // 今年
  if (sameYear) return month + '-' + day + ' ' + hour + ':' + minute;

  // 其他
  return target.getFullYear() + '-' + month + '-' + day;
}

module.exports = { formatMessageTime };
