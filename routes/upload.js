/**
 * 文件上传路由
 * 
 * 功能：
 * - 单张图片上传
 * - 批量图片上传（最多9张）
 * 
 * 路由列表：
 * - POST /api/upload - 上传单张图片（需要登录）
 * - POST /api/upload/batch - 批量上传图片（需要登录）
 * 
 * 上传限制：
 * - 文件格式：jpg/jpeg/png/gif/webp
 * - 文件大小：最大 5MB
 * - 批量上传：最多 9 张
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

// 上传目录
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExts.includes(ext)) {
    return cb(new Error('仅支持 jpg/png/gif/webp 格式'));
  }
  
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('文件类型不匹配'));
  }
  
  cb(null, true);
};

// Multer 实例
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
});

// 单张图片上传
router.post('/', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return fail(res, '请选择图片');
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  success(res, { url, filename: req.file.filename });
});

// 批量图片上传
router.post('/batch', auth, upload.array('images', 9), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return fail(res, '请选择图片');
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const urls = req.files.map(file => ({
    url: `${baseUrl}/uploads/${file.filename}`,
    filename: file.filename,
  }));
  success(res, urls);
});

module.exports = router;
