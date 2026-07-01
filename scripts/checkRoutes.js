/**
 * 路由检查脚本
 * 
 * 功能：
 * - 检查路由文件中引用的控制器、验证器、中间件是否存在
 * - 检查控制器文件中引用的模型、工具函数是否存在
 * - 输出检查结果
 * 
 * 使用方式：
 *   node scripts/checkRoutes.js
 *   npm run check-routes
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'routes');
const controllersDir = path.join(__dirname, '..', 'controllers');
const validatorsDir = path.join(__dirname, '..', 'validators');
const middlewareDir = path.join(__dirname, '..', 'middleware');
const modelsDir = path.join(__dirname, '..', 'models');
const utilsDir = path.join(__dirname, '..', 'utils');

function checkFileExists(dir, name, extension = '.js') {
  const filePath = path.join(dir, `${name}${extension}`);
  return fs.existsSync(filePath);
}

function extractRequires(content, prefix) {
  const regex = new RegExp(`require\\(['"]\\.\\.\\/${prefix}\\/(\\w+)['"]\\)`, 'g');
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function checkRoutes() {
  console.log('🔍 检查路由连通性...\n');

  const issues = [];

  // 读取所有路由文件
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') && f !== 'routeMap.js');

  for (const routeFile of routeFiles) {
    const routePath = path.join(routesDir, routeFile);
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    // 检查控制器引用
    const controllers = extractRequires(routeContent, 'controllers');
    for (const controller of controllers) {
      if (!checkFileExists(controllersDir, controller)) {
        issues.push({
          file: routeFile,
          issue: `控制器 ${controller} 不存在`,
          type: 'error',
        });
      }
    }

    // 检查验证器引用
    const validators = extractRequires(routeContent, 'validators');
    for (const validator of validators) {
      if (!checkFileExists(validatorsDir, validator)) {
        issues.push({
          file: routeFile,
          issue: `验证器 ${validator} 不存在`,
          type: 'error',
        });
      }
    }

    // 检查中间件引用
    const middlewares = extractRequires(routeContent, 'middleware');
    for (const middleware of middlewares) {
      if (!checkFileExists(middlewareDir, middleware)) {
        issues.push({
          file: routeFile,
          issue: `中间件 ${middleware} 不存在`,
          type: 'error',
        });
      }
    }
  }

  // 检查控制器文件
  const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
  for (const controllerFile of controllerFiles) {
    const controllerPath = path.join(controllersDir, controllerFile);
    const controllerContent = fs.readFileSync(controllerPath, 'utf-8');

    // 检查模型引用
    const models = extractRequires(controllerContent, 'models');
    for (const model of models) {
      if (!checkFileExists(modelsDir, model)) {
        issues.push({
          file: controllerFile,
          issue: `模型 ${model} 不存在`,
          type: 'error',
        });
      }
    }

    // 检查工具函数引用
    const utils = extractRequires(controllerContent, 'utils');
    for (const util of utils) {
      if (!checkFileExists(utilsDir, util)) {
        issues.push({
          file: controllerFile,
          issue: `工具函数 ${util} 不存在`,
          type: 'error',
        });
      }
    }
  }

  // 输出结果
  if (issues.length === 0) {
    console.log('✅ 所有路由连通性检查通过！');
  } else {
    console.log(`❌ 发现 ${issues.length} 个问题：\n`);
    for (const issue of issues) {
      const icon = issue.type === 'error' ? '❌' : '⚠️';
      console.log(`  ${icon} ${issue.file}: ${issue.issue}`);
    }
  }

  return issues;
}

// 如果直接运行此脚本
if (require.main === module) {
  const issues = checkRoutes();
  process.exit(issues.length > 0 ? 1 : 0);
}

module.exports = { checkRoutes };
