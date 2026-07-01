/**
 * 内容审核中间件
 * 
 * 功能：
 * - 检测用户提交的内容是否包含敏感词
 * - 支持检测 content、topic、bio、nickname 等字段
 * - 发现敏感词时返回 400 错误
 * 
 * 使用方式：
 *   router.post('/posts', auth, validateContent, controller.createPost);
 * 
 * 敏感词分类：
 * - 色情类
 * - 赌博类
 * - 毒品类
 * - 暴力类
 * - 政治类
 * - 辱骂类
 */

// 敏感词库（按类别组织）
const sensitiveWords = [
  // 色情类
  '色情', '裸体', '性爱', '淫秽', '下流', '卖淫', '嫖娼', '淫荡', '骚货',
  '妓女', '鸡巴', '阴茎', '阴道', '乳房', '做爱', '口交', '肛交',
  // 赌博类
  '赌博', '博彩', '赌场', '下注', '赌球', '赌马', '老虎机', '百家乐',
  '六合彩', '外围', '庄家', '赔率',
  // 毒品类
  '毒品', '大麻', '冰毒', '摇头丸', '海洛因', '可卡因', '鸦片', 'K粉',
  '吸毒', '贩毒', '戒毒',
  // 暴力类
  '暴力', '枪支', '手枪', '炸弹', '爆炸', '杀人', '砍人', '捅人',
  '恐怖分子', '恐怖袭击', '绑架', '枪击',
  // 诈骗类
  '诈骗', '骗局', '传销', '洗钱', '非法集资', '庞氏骗局', '杀猪盘',
  '刷单', '薅羊毛',
  // 辱骂类
  '傻逼', '操你', '他妈', '狗日', '混蛋', '贱人', '婊子', '王八蛋',
  '煞笔', '智障', '白痴', '弱智', '废物', '垃圾', '去死',
  // 英文脏话
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
  'dick', 'pussy', 'cock',
];

/**
 * 检测文本是否包含敏感词
 * @param {string} text - 要检测的文本
 * @returns {boolean} - 是否包含敏感词
 */
function containsSensitiveWord(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return sensitiveWords.some(word => lowerText.includes(word));
}

/**
 * 过滤文本中的敏感词（替换为星号）
 * @param {string} text - 要过滤的文本
 * @returns {string} - 过滤后的文本
 */
function filterSensitiveWord(text) {
  if (!text) return text;
  let filtered = text;
  sensitiveWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
}

/**
 * 内容验证中间件
 * 检查请求体中的 content、topic、bio、nickname 字段
 */
function validateContent(req, res, next) {
  const { content, topic, bio, nickname } = req.body;
  
  // 收集需要检查的文本
  const textsToCheck = [content, topic, bio, nickname].filter(Boolean);
  
  // 逐个检查
  for (const text of textsToCheck) {
    if (containsSensitiveWord(text)) {
      return res.status(400).json({
        code: 1,
        data: null,
        msg: '内容包含敏感词，请修改后重试',
      });
    }
  }
  
  next();
}

/**
 * AI 消息验证中间件
 * 检查 messages 数组中每条消息的 content 字段
 */
function validateAIMessages(req, res, next) {
  const { messages } = req.body;
  
  if (!Array.isArray(messages)) {
    return next();
  }
  
  // 只检查用户发送的消息（role 为 user）
  for (const msg of messages) {
    if (msg.role === 'user' && msg.content && containsSensitiveWord(msg.content)) {
      return res.status(400).json({
        code: 1,
        data: null,
        msg: '消息内容包含敏感词，请修改后重试',
      });
    }
  }
  
  next();
}

module.exports = { containsSensitiveWord, filterSensitiveWord, validateContent, validateAIMessages };
