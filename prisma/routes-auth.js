/**
 * prisma/routes-auth.js — 鉴权路由 (阶段 4)
 *
 * 提供 5 个端点:
 *   POST /api/auth/login      登录 (限流 + bcrypt verify + 发 cookie)
 *   POST /api/auth/refresh    刷新 access token (用 refresh token 换新 access + 新 refresh)
 *   POST /api/auth/logout     登出 (清 cookie)
 *   GET  /api/auth/me         返回当前登录用户信息
 *   POST /api/auth/register   注册 (开发期开放, 生产可由 admin 后台邀请)
 *
 * 挂载方式:
 *   const authRouter = require('./prisma/routes-auth');
 *   app.use('/api/auth', authRouter);
 *
 * 注意:
 *   - 路由内调 prisma/dal 的 User 函数, 走 prismaModule 单例
 *   - 限流中间件 (loginLimiter) 只挂在 /login 上, 不影响 /me
 *   - 注册端点仅在 ALLOW_REGISTER=1 时开放, 默认关闭 (防恶意注册)
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('./auth');
const logger = require('../src/utils/logger');

// 延迟加载 email 模块 + 清缓存, 绕过 Docker bind mount 的 Node require 缓存问题
function getEmail() {
  delete require.cache[require.resolve('./email')];
  return require('./email');
}
const { Prisma } = require('@prisma/client');
const rateLimit = require('express-rate-limit');

// 🔒 注册限流: 5 次/15分钟/IP, 防脚本批量注册
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: '注册尝试过多, 请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

// 工具: 从 server.js 注入 prisma 实例 (避免路由文件直接 require prismaModule)
function getPrisma(req) {
  return req.app.locals.prisma;
}

// 🔒 找回密码限流: 5 次/小时/IP, 防邮件轰炸 / 账号枚举探测
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: '请求过于频繁, 请 1 小时后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

// ==================== POST /api/auth/login ====================

router.post('/login', auth.loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' });
    }

    const prisma = getPrisma(req);
    const dal = require('./dal');

    // 1. 查用户
    const user = await dal.findUserByUsername(username, prisma);
    if (!user) {
      // 不区分"用户不存在"和"密码错误", 防枚举
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 2. 查账号锁定
    auth.checkAccountLocked(user);

    // 3. 验密码
    const ok = await auth.verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 4. 发 cookie
    auth.setAuthCookies(res, {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || '登录失败' });
  }
});

// ==================== POST /api/auth/refresh ====================

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[auth.COOKIE_REFRESH];
    if (!refreshToken) {
      return res.status(401).json({ error: '缺少 refresh token' });
    }

    // 1. 验签
    let payload;
    try {
      payload = auth.verifyToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'refresh token 无效' });
    }
    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'token 类型错误' });
    }

    // 2. 查用户 (确保账号还可用)
    const prisma = getPrisma(req);
    const dal = require('./dal');
    const user = await dal.findUserById(payload.sub, prisma);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    auth.checkAccountLocked(user);

    // 3. 轮换: 发新 access + 新 refresh + 新 csrf
    auth.setAuthCookies(res, {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });

    res.json({ ok: true });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || '刷新失败' });
  }
});

// ==================== POST /api/auth/logout ====================

router.post('/logout', (req, res) => {
  auth.clearAuthCookies(res);
  res.json({ ok: true });
});

// ==================== GET /api/auth/me ====================

router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '未登录' });
  }
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.displayName,
      role: req.user.role
    }
  });
});

// ==================== POST /api/auth/register ====================
// 开发期开放, ALLOW_REGISTER=1 启用
// 生产环境建议关掉, 改用 admin 邀请码

router.post('/register', registerLimiter, async (req, res) => {
  if (process.env.ALLOW_REGISTER !== '1') {
    return res.status(403).json({ error: '注册功能已关闭' });
  }
  try {
    const { username, password, email, displayName } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' });
    }
    // 邮箱必填 + 格式校验: 找回密码流程依赖邮箱, 注册时就必须采集
    if (!email || !email.trim()) {
      return res.status(400).json({ error: '邮箱必填, 用于找回密码' });
    }
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    const prisma = getPrisma(req);
    const dal = require('./dal');

    // 显式查重, 给出精确提示 (比笼统的 P2002 友好)
    if (await dal.findUserByUsername(username, prisma)) {
      return res.status(409).json({ error: '用户名已被占用' });
    }
    if (await dal.findUserByEmail(email.trim(), prisma)) {
      return res.status(409).json({ error: '邮箱已被占用' });
    }

    const passwordHash = await auth.hashPassword(password);
    const user = await dal.createUser({
      username,
      email: email.trim(),
      passwordHash,
      displayName,
      role: 'user'
    }, prisma);

    // 注册成功自动登录 (跟 login 一样发 cookie)
    auth.setAuthCookies(res, {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: '用户名或邮箱已被占用' });
    }
    res.status(500).json({ error: err.message || '注册失败' });
  }
});

// ==================== POST /api/auth/forgot-password ====================
// 输入邮箱 → 发 6 位验证码。无论邮箱是否存在都返回相同提示, 防账号枚举。
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !email.trim()) {
      return res.status(400).json({ error: '请输入邮箱' });
    }

    const prisma = getPrisma(req);
    const dal = require('./dal');

    const user = await dal.findUserByEmail(email, prisma);
    const okMsg = '验证码已发送到邮箱, 请查收（5 分钟内有效）';

    if (user) {
      // 1. 生成 6 位数字验证码 + 存其 SHA-256 哈希
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟有效

      await dal.setPasswordResetToken(user.id, codeHash, expiresAt, prisma);

      // 2. 发邮件 (失败静默, 防枚举)
      try {
        await getEmail().sendCodeEmail({ to: user.email, code, username: user.username });
      } catch (mailErr) {
        logger.warn('[找回密码] 邮件发送失败:', mailErr.message, mailErr.code, mailErr.response);
        console.error('[DEBUG] 完整错误:', mailErr);
      }

      // 开发环境 (无真实 SMTP) 回传验证码方便测试
      if (!process.env.SMTP_HOST) {
        return res.json({ ok: true, message: okMsg, devCode: code });
      }
    }

    res.json({ ok: true, message: okMsg });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || '请求失败' });
  }
});

// ==================== POST /api/auth/reset-password ====================
// 输入邮箱 + 验证码 + 新密码 → 校验 → 改密码
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body || {};
    if (!email || !code || !password) {
      return res.status(400).json({ error: '邮箱、验证码和新密码都必填' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    const prisma = getPrisma(req);
    const dal = require('./dal');

    // 1. 按邮箱找到用户
    const user = await dal.findUserByEmail(email, prisma);
    if (!user || !user.passwordResetToken) {
      return res.status(400).json({ error: '验证码无效或已过期, 请重新申请' });
    }

    // 2. 校验验证码
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (user.passwordResetToken !== codeHash) {
      return res.status(400).json({ error: '验证码错误' });
    }
    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      return res.status(400).json({ error: '验证码已过期, 请重新申请' });
    }

    // 3. 改密码
    const passwordHash = await auth.hashPassword(password);
    await dal.updatePassword(user.id, passwordHash, prisma);

    // 4. 用完即废
    await dal.clearPasswordResetToken(user.id, prisma);

    res.json({ ok: true, message: '密码已重置, 请用新密码登录' });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || '重置失败' });
  }
});

module.exports = router;
