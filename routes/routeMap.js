/**
 * 路由映射表
 * 
 * 功能：
 * - 记录所有 API 路由信息
 * - 提供路由查询方法
 * - 用于文档生成和路由检查
 * 
 * 使用方式：
 *   const routeMap = require('./routes/routeMap');
 *   
 *   // 获取所有路由
 *   routeMap.getRouteMap();
 *   
 *   // 按方法筛选路由
 *   routeMap.getRoutesByMethod('GET');
 *   
 *   // 获取需要认证的路由
 *   routeMap.getAuthRoutes();
 *   
 *   // 获取公开路由
 *   routeMap.getPublicRoutes();
 */

module.exports = {
  routes: [
    { method: 'GET', path: '/health', description: '健康检查', auth: false },
    { method: 'GET', path: '/', description: '首页', auth: false },

    // 用户相关
    { method: 'POST', path: '/api/users/register', description: '用户注册', auth: false },
    { method: 'POST', path: '/api/users/login', description: '用户登录', auth: false },
    { method: 'GET', path: '/api/users/me', description: '获取当前用户', auth: true },
    { method: 'GET', path: '/api/users/search', description: '搜索用户', auth: true },
    { method: 'PUT', path: '/api/users/profile', description: '更新用户资料', auth: true },
    { method: 'GET', path: '/api/users/:id/profile', description: '获取用户资料', auth: true },

    // 个人资料
    { method: 'GET', path: '/api/profile', description: '获取个人资料', auth: true },
    { method: 'PUT', path: '/api/profile', description: '更新个人资料', auth: true },

    // 帖子相关
    { method: 'GET', path: '/api/posts/drafts', description: '获取草稿列表', auth: true },
    { method: 'POST', path: '/api/posts/drafts', description: '创建草稿', auth: true },
    { method: 'PUT', path: '/api/posts/drafts/:id', description: '更新草稿', auth: true },
    { method: 'DELETE', path: '/api/posts/drafts/:id', description: '删除草稿', auth: true },
    { method: 'GET', path: '/api/posts/mine', description: '获取我的帖子', auth: true },
    { method: 'GET', path: '/api/posts/feed', description: '获取动态流', auth: true },
    { method: 'GET', path: '/api/posts/search', description: '搜索帖子', auth: true },
    { method: 'GET', path: '/api/posts/friends', description: '获取朋友帖子', auth: true },
    { method: 'GET', path: '/api/posts/count', description: '获取帖子数量', auth: true },
    { method: 'GET', path: '/api/posts/user/:userId', description: '获取用户帖子', auth: true },
    { method: 'POST', path: '/api/posts', description: '创建帖子', auth: true },
    { method: 'DELETE', path: '/api/posts/:id', description: '删除帖子', auth: true },
    { method: 'GET', path: '/api/posts/:id', description: '获取帖子详情', auth: true },

    // 关注相关
    { method: 'GET', path: '/api/follow/count', description: '获取关注数量', auth: true },
    { method: 'GET', path: '/api/follow/following', description: '获取关注列表', auth: true },
    { method: 'GET', path: '/api/follow/fans', description: '获取粉丝列表', auth: true },
    { method: 'POST', path: '/api/follow/:userId', description: '关注用户', auth: true },
    { method: 'DELETE', path: '/api/follow/:userId', description: '取消关注', auth: true },

    // 点赞相关
    { method: 'POST', path: '/api/likes/:postId', description: '点赞帖子', auth: true },
    { method: 'DELETE', path: '/api/likes/:postId', description: '取消点赞', auth: true },
    { method: 'GET', path: '/api/likes/status', description: '获取点赞状态', auth: true },
    { method: 'GET', path: '/api/likes/mine', description: '获取我的点赞', auth: true },

    // 收藏相关
    { method: 'POST', path: '/api/bookmarks/:postId', description: '收藏帖子', auth: true },
    { method: 'DELETE', path: '/api/bookmarks/:postId', description: '取消收藏', auth: true },
    { method: 'GET', path: '/api/bookmarks/status', description: '获取收藏状态', auth: true },
    { method: 'GET', path: '/api/bookmarks/mine', description: '获取我的收藏', auth: true },

    // 评论相关
    { method: 'POST', path: '/api/comments/:postId', description: '创建评论', auth: true },
    { method: 'GET', path: '/api/comments/:postId', description: '获取评论列表', auth: true },
    { method: 'DELETE', path: '/api/comments/:id', description: '删除评论', auth: true },

    // 消息相关
    { method: 'GET', path: '/api/messages/conversations', description: '获取会话列表', auth: true },
    { method: 'GET', path: '/api/messages/conversation-detail/:userId', description: '获取会话详情', auth: true },
    { method: 'GET', path: '/api/messages/history/:userId', description: '获取聊天记录', auth: true },
    { method: 'GET', path: '/api/messages/search/:userId', description: '搜索消息', auth: true },
    { method: 'PATCH', path: '/api/messages/conversations/:id/pin', description: '置顶会话', auth: true },
    { method: 'PATCH', path: '/api/messages/conversations/:id/mute', description: '静音会话', auth: true },
    { method: 'DELETE', path: '/api/messages/conversations/:id', description: '删除会话', auth: true },
    { method: 'GET', path: '/api/messages/summary', description: '获取消息摘要', auth: true },
    { method: 'GET', path: '/api/messages/notifications', description: '获取通知列表', auth: true },
    { method: 'PATCH', path: '/api/messages/notifications/read-all', description: '标记所有通知已读', auth: true },
    { method: 'DELETE', path: '/api/messages/notifications/:id', description: '删除通知', auth: true },
    { method: 'POST', path: '/api/messages/:userId', description: '发送消息', auth: true },

    // AI 相关
    { method: 'POST', path: '/api/ai/chat', description: 'AI 聊天', auth: false },

    // 上传相关
    { method: 'POST', path: '/api/upload', description: '上传图片', auth: true },
    { method: 'POST', path: '/api/upload/batch', description: '批量上传图片', auth: true },
  ],

  getRouteMap() {
    return this.routes.map(route => ({
      ...route,
      fullPath: route.path,
    }));
  },

  getRoutesByMethod(method) {
    return this.routes.filter(route => route.method === method);
  },

  getAuthRoutes() {
    return this.routes.filter(route => route.auth);
  },

  getPublicRoutes() {
    return this.routes.filter(route => !route.auth);
  },
};
