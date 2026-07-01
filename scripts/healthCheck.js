/**
 * 健康检查脚本
 * 
 * 功能：
 * - 检查所有 API 路由的连通性
 * - 检查公共路由是否正常响应
 * - 检查受保护路由是否正确返回 401
 * - 输出检查结果统计
 * 
 * 使用方式：
 *   node scripts/healthCheck.js
 *   npm run health
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const publicRoutes = [
  { method: 'GET', path: '/health', name: '健康检查' },
  { method: 'GET', path: '/', name: '首页' },
  { method: 'POST', path: '/api/users/register', name: '用户注册', data: { name: 'testuser', password: 'test123456' } },
  { method: 'POST', path: '/api/users/login', name: '用户登录', data: { name: 'testuser', password: 'test123456' } },
];

const protectedRoutes = [
  { method: 'GET', path: '/api/users/me', name: '获取当前用户' },
  { method: 'GET', path: '/api/profile', name: '获取个人资料' },
  { method: 'GET', path: '/api/posts/feed', name: '获取动态流' },
  { method: 'GET', path: '/api/posts/mine', name: '获取我的帖子' },
  { method: 'GET', path: '/api/posts/count', name: '获取帖子数量' },
  { method: 'GET', path: '/api/follow/count', name: '获取关注数量' },
  { method: 'GET', path: '/api/follow/following', name: '获取关注列表' },
  { method: 'GET', path: '/api/follow/fans', name: '获取粉丝列表' },
  { method: 'GET', path: '/api/likes/mine', name: '获取我的点赞' },
  { method: 'GET', path: '/api/bookmarks/mine', name: '获取我的收藏' },
  { method: 'GET', path: '/api/messages/conversations', name: '获取会话列表' },
  { method: 'GET', path: '/api/messages/summary', name: '获取消息摘要' },
  { method: 'GET', path: '/api/messages/notifications', name: '获取通知列表' },
];

async function checkRoute(route, token = null) {
  try {
    const config = {
      method: route.method.toLowerCase(),
      url: `${BASE_URL}${route.path}`,
      timeout: 5000,
    };

    if (token) {
      config.headers = { 'x-auth-token': token };
    }

    if (route.data) {
      config.data = route.data;
    }

    const response = await axios(config);
    return {
      name: route.name,
      path: route.path,
      method: route.method,
      status: response.status,
      success: response.data?.code === 0 || response.status === 200,
      message: response.data?.msg || 'OK',
    };
  } catch (error) {
    return {
      name: route.name,
      path: route.path,
      method: route.method,
      status: error.response?.status || 0,
      success: false,
      message: error.response?.data?.msg || error.message,
    };
  }
}

async function runHealthCheck() {
  console.log('🔍 开始路由连通性检查...\n');
  console.log(`📍 目标服务器: ${BASE_URL}\n`);

  const results = [];

  // 检查公共路由
  console.log('📋 检查公共路由:');
  for (const route of publicRoutes) {
    const result = await checkRoute(route);
    results.push(result);
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.method} ${result.path} - ${result.name} (${result.status})`);
  }

  // 检查受保护路由（无 token）
  console.log('\n📋 检查受保护路由（无 token）:');
  for (const route of protectedRoutes) {
    const result = await checkRoute(route);
    results.push(result);
    // 受保护路由无 token 应该返回 401
    const isExpected = result.status === 401;
    const status = isExpected ? '✅' : '⚠️';
    console.log(`  ${status} ${result.method} ${result.path} - ${result.name} (${result.status})`);
  }

  // 统计结果
  const total = results.length;
  const success = results.filter(r => r.success || r.status === 401).length;
  const failed = total - success;

  console.log('\n📊 检查结果:');
  console.log(`  总计: ${total}`);
  console.log(`  成功: ${success}`);
  console.log(`  失败: ${failed}`);
  console.log(`  成功率: ${((success / total) * 100).toFixed(2)}%`);

  if (failed > 0) {
    console.log('\n❌ 失败的路由:');
    results
      .filter(r => !r.success && r.status !== 401)
      .forEach(r => {
        console.log(`  - ${r.method} ${r.path}: ${r.message}`);
      });
  }

  return { total, success, failed, results };
}

// 如果直接运行此脚本
if (require.main === module) {
  runHealthCheck()
    .then(result => {
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('检查失败:', error);
      process.exit(1);
    });
}

module.exports = { checkRoute, runHealthCheck };
