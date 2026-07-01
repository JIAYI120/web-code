/**
 * 互动通知工具
 * 
 * 功能：
 * - createInteractionNotification: 创建互动通知
 * - deleteInteractionNotification: 删除互动通知
 */

const InteractionNotification = require('../models/InteractionNotification');

/**
 * 创建互动通知
 * @param {string} recipient - 接收者 ID
 * @param {string} actor - 操作者 ID
 * @param {string} type - 通知类型（like/comment/bookmark/follow）
 * @param {string} post - 相关帖子 ID
 * @param {string} comment - 相关评论 ID
 * @param {string} content - 评论内容
 * @returns {object|null} - 创建的通知
 */
async function createInteractionNotification({ recipient, actor, type, post = null, comment = null, content = '' }) {
  // 参数校验
  if (!recipient || !actor || !type) {
    return null;
  }

  // 不给自己发通知
  if (String(recipient) === String(actor)) {
    return null;
  }

  const notification = new InteractionNotification({
    recipient,
    actor,
    type,
    post,
    comment,
    content,
    isRead: false,
  });

  await notification.save();
  return notification;
}

/**
 * 删除互动通知
 * @param {string} recipient - 接收者 ID
 * @param {string} actor - 操作者 ID
 * @param {string} type - 通知类型
 * @param {string} post - 相关帖子 ID
 * @param {string} comment - 相关评论 ID
 * @returns {object|null} - 删除的通知
 */
async function deleteInteractionNotification({ recipient, actor, type, post = null, comment = null }) {
  // 参数校验
  if (!recipient || !actor || !type) {
    return null;
  }

  const query = {
    recipient,
    actor,
    type,
  };

  // 优先按评论删除，其次按帖子删除
  if (comment) {
    query.comment = comment;
  } else if (post) {
    query.post = post;
  }

  return InteractionNotification.findOneAndDelete(query).sort({ createdAt: -1 });
}

module.exports = {
  createInteractionNotification,
  deleteInteractionNotification,
};
