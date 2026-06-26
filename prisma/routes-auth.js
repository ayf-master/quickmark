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
const auth = require('./auth');
const { Prisma } = require('@prisma/client');

// 工具: 从 server.js 注入 prisma 实例 (避免路由文件直接 require prismaModule)
function getPrisma(req) {
  return req.app.locals.prisma;
}

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

router.post('/register', async (req, res) => {
  if (process.env.ALLOW_REGISTER !== '1') {
    return res.status(403).json({ error: '注册功能已关闭' });
  }
  try {
    const { username, password, email, displayName } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    const prisma = getPrisma(req);
    const dal = require('./dal');

    const passwordHash = await auth.hashPassword(password);
    const user = await dal.createUser({
      username,
      email,
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

module.exports = router;
