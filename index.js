/**
 * 校园微博后端入口文件
 * 
 * 功能说明：
 * - 初始化 Express 应用和 HTTP 服务器
 * - 配置 Socket.io 实时通信
 * - 连接 MongoDB Atlas 数据库
 * - 注册所有路由和中间件
 * - 配置安全防护（Helmet、CORS、限流）
 * - 配置日志系统（Winston）
 * - 处理优雅关机和全局异常
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

// 导入日志工具
const { logger, requestLogger } = require('./utils/logger');

// ========== 环境变量校验 ==========
// 必需的环境变量
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    logger.error('缺少必需的环境变量: ' + key);
    process.exit(1);
  }
}

// 可选的环境变量（缺失时记录警告）
const optionalEnvVars = {
  'XIAOMI_API_KEY': 'AI 聊天和情绪分析功能将不可用',
  'XIAOMI_API_BASE_URL': 'AI 聊天和情绪分析功能将不可用',
  'XIAOMI_MODEL': 'AI 聊天和情绪分析功能将不可用',
  'ALLOWED_ORIGINS': '将使用默认值: http://localhost:5173,http://localhost:3000',
};

for (const [key, message] of Object.entries(optionalEnvVars)) {
  if (!process.env[key]) {
    logger.warn('可选环境变量未设置: ' + key + ' - ' + message);
  }
}

// 创建日志目录
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 导入限流中间件
const { apiLimiter, aiLimiter, authLimiter } = require('./middleware/rateLimit');

// 导入 Conversation 和 Message 模型（用于 Socket.io）
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// ========== 初始化应用 ==========
const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

// ========== CORS 配置 ==========
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'capacitor://localhost',
      'http://localhost',
    ];

// ========== Socket.io 配置 ==========
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ========== 在线用户管理 ==========
// 存储在线用户的 socket 连接，key: userId, value: socketId
const onlineUsers = new Map();

// Socket.io 认证中间件
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('认证错误'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user.id;
    next();
  } catch (err) {
    next(new Error('无效的令牌'));
  }
});

// Socket.io 连接处理
io.on('connection', (socket) => {
  const userId = socket.userId;
  logger.info('用户连接: ' + userId);
  
  // 记录在线用户
  onlineUsers.set(userId, socket.id);
  io.emit('user:online', { userId, online: true });

  // 加入会话房间（需要验证权限）
  socket.on('join:conversation', async (conversationId) => {
    try {
      const conversation = await Conversation.findById(conversationId).select('participants');
      if (!conversation) {
        socket.emit('message:error', { error: '会话不存在' });
        return;
      }
      // 验证当前用户是否是参与者
      const isParticipant = conversation.participants.some(p => p.toString() === userId);
      if (!isParticipant) {
        socket.emit('message:error', { error: '无权加入此会话' });
        return;
      }
      socket.join('conversation:' + conversationId);
    } catch (err) {
      logger.error('[Socket.join:conversation]', { error: err.message, userId, conversationId });
      socket.emit('message:error', { error: '加入会话失败' });
    }
  });

  // 离开会话房间
  socket.on('leave:conversation', (conversationId) => {
    socket.leave('conversation:' + conversationId);
  });

  // 发送消息事件（持久化 + 房间广播）
  socket.on('message:send', async (data) => {
    const { conversationId, receiverId, content } = data;
    
    // 验证消息内容
    if (!content || typeof content !== 'string') {
      socket.emit('message:error', { error: '消息内容不能为空' });
      return;
    }
    
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      socket.emit('message:error', { error: '消息内容不能为空' });
      return;
    }
    
    if (trimmedContent.length > 2000) {
      socket.emit('message:error', { error: '消息内容不能超过2000个字符' });
      return;
    }
    
    // 检查敏感词
    const { containsSensitiveWord } = require('./middleware/contentFilter');
    if (containsSensitiveWord(trimmedContent)) {
      socket.emit('message:error', { error: '消息包含敏感词，请修改后重试' });
      return;
    }
    
    try {
      // 验证会话存在且用户是参与者
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit('message:error', { error: '会话不存在' });
        return;
      }
      const isParticipant = conversation.participants.some(p => p.toString() === userId);
      if (!isParticipant) {
        socket.emit('message:error', { error: '无权发送消息' });
        return;
      }
      
      // 持久化消息到数据库
      const message = new Message({
        conversation: conversationId,
        sender: userId,
        receiver: receiverId,
        content: trimmedContent,
        isRead: false,
      });
      await message.save();
      
      // 更新会话最后消息
      conversation.lastMessage = trimmedContent;
      conversation.lastMessageAt = message.createdAt;
      conversation.deletedBy = (conversation.deletedBy || []).filter(
        id => id.toString() !== userId && id.toString() !== receiverId
      );
      await conversation.save();
      
      // 只通过房间广播（不单独向接收者发送，避免重复）
      io.to('conversation:' + conversationId).emit('message:new', {
        _id: message._id,
        conversationId,
        senderId: userId,
        receiverId,
        content: trimmedContent,
        createdAt: message.createdAt,
      });
      
      // 清除相关缓存
      const cache = require('./utils/cache');
      cache.invalidatePattern('^conversations:' + userId);
      cache.invalidatePattern('^conversations:' + receiverId);
      
    } catch (err) {
      logger.error('[Socket.message:send]', { error: err.message, userId, conversationId });
      socket.emit('message:error', { error: '消息发送失败' });
    }
  });

  // 开始输入事件
  socket.on('typing:start', (data) => {
    const { conversationId, receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:start', { conversationId, userId });
    }
  });

  // 停止输入事件
  socket.on('typing:stop', (data) => {
    const { conversationId, receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:stop', { conversationId, userId });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    logger.info('用户断开连接: ' + userId);
    onlineUsers.delete(userId);
    io.emit('user:online', { userId, online: false });
  });
});

// 将 io 和 onlineUsers 挂载到 app 上，供控制器使用
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// ========== 安全中间件 ==========
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Gzip 压缩
app.use(compression());

// CORS 跨域配置
app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（原生 App、Postman 等）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  allowedHeaders: ['Content-Type', 'x-auth-token'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
  maxAge: 86400,
}));

// OPTIONS 预检请求处理
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ========== 请求体解析 ==========
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ========== 请求日志中间件 ==========
app.use(requestLogger);

// ========== 静态资源 ==========
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true,
}));

// ========== 根路由 ==========
app.get('/', (req, res) => {
  res.send('Hello, xiaoyuanAPP!');
});

// ========== 健康检查接口 ==========
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: Date.now(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
  res.json(healthCheck);
});

// ========== 路由列表接口（仅开发环境可用） ==========
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/routes', (req, res) => {
    const routeMap = require('./routes/routeMap');
    res.json({
      code: 0,
      data: routeMap.getRouteMap(),
      msg: 'ok',
    });
  });
}

// ========== API 路由注册 ==========
// 全局限流
app.use('/api', apiLimiter);

// 用户相关路由（登录注册有单独限流）
app.use('/api/users', authLimiter, require('./routes/users'));

// 个人资料路由
app.use('/api/profile', require('./routes/profile'));

// 帖子相关路由
app.use('/api/posts', require('./routes/posts'));

// 关注相关路由
app.use('/api/follow', require('./routes/follow'));

// 点赞相关路由
app.use('/api/likes', require('./routes/likes'));

// 评论相关路由
app.use('/api/comments', require('./routes/comments'));

// 收藏相关路由
app.use('/api/bookmarks', require('./routes/bookmarks'));

// 消息相关路由
app.use('/api/messages', require('./routes/messages'));

// AI 相关路由（有单独限流）
app.use('/api/ai', aiLimiter, require('./routes/ai'));

// 文件上传路由
app.use('/api/upload', require('./routes/upload'));

// ========== 全局错误处理 ==========
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ========== 数据库连接 ==========
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,              // 连接池大小
  serverSelectionTimeoutMS: 5000,  // 服务器选择超时
  socketTimeoutMS: 45000,       // Socket 超时
})
  .then(() => logger.info('MongoDB 连接成功!'))
  .catch(err => {
    logger.error('MongoDB 连接错误:', err);
    process.exit(1);
  });

// ========== 启动服务器 ==========
httpServer.listen(port, '0.0.0.0', () => {
  logger.info('xiaoyuanAPP 后端服务运行在端口 ' + port);
});

// ========== 优雅关机处理 ==========
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在优雅关闭...');
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('服务器已关闭');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，正在优雅关闭...');
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('服务器已关闭');
      process.exit(0);
    });
  });
});

// ========== 全局异常处理 ==========
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', promise, '原因:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常:', err);
  process.exit(1);
});

module.exports = { app, io };
