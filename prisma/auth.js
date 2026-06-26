/**
 * prisma/auth.js — 鉴权工具 (阶段 4)
 *
 * 核心能力:
 *   1. bcrypt 密码 hash/verify (bcryptjs, 8 轮, 平衡安全与性能)
 *   2. JWT 签发/验证 (jsonwebtoken, HS256, alg 显式防算法替换攻击)
 *   3. httpOnly cookie 包装: access_token (1h) + refresh_token (30d) + csrf_token
 *   4. CSRF 双 token 模式: 写操作要求请求头 X-CSRF-Token 与 cookie 一致
 *   5. Express 中间件: requireAuth / attachUser / loginLimiter / csrfProtection
 *
 * 设计取舍:
 *   - 短 access + 长 refresh 是 OAuth 2.0 标准做法; access 泄露后窗体小
 *   - refresh 轮换策略: 每次 refresh 同时签新 access + 新 refresh + 旧 refresh 失效
 *   - CSRF: SameSite=Lax + double-submit cookie 是 OWASP 推荐, 比 synchronizer 简单
 *   - 锁账号 vs 限流: F2 限流 (5 次/15 分钟/IP) 兜底, 暂不锁账号, 留 admin 手动解锁
 *
 * 安全清单:
 *   - alg: 'HS256' 显式声明, 防 alg=none / RS256→HS256 攻击
 *   - secret 优先从 .env 读, 缺则启动失败 (D2 方案)
 *   - maxAge 与 cookie 一致, 防止 token 永久有效
 *   - issuer/audience 字段防 token 跨站复用
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// ==================== 配置 ====================

// JWT secret: 优先 .env, 没有则启动失败 (避免用弱默认值上线)
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'quickmark';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'quickmark-web';

// 有效期
const ACCESS_TOKEN_TTL = '1h';      // E2 决策: access 1h
const REFRESH_TOKEN_TTL = '30d';    //          refresh 30d
const CSRF_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;  // 30d 与 refresh 对齐

// Cookie 名
const COOKIE_ACCESS = 'qm_access';
const COOKIE_REFRESH = 'qm_refresh';
const COOKIE_CSRF = 'qm_csrf';

// ==================== 启动校验 ====================

function requireJwtSecret() {
  if (!JWT_SECRET || JWT_SECRET.trim().length < 32) {
    logger.error('\n❌ JWT_SECRET 未设置或长度不足 (至少 32 字符)');
    logger.error('   方案 D2: 在 .env 加 JWT_SECRET=<32+ 位随机字符串>');
    logger.error('   生成方式: node -e "logger.info(require(\'crypto\').randomBytes(48).toString(\'base64\'))"\n');
    process.exit(1);
  }
}

// ==================== 密码 ====================

const BCRYPT_ROUNDS = 8;  // 8 轮 ≈ 50ms, 平衡登录延迟与暴力破解成本

/** 密码 hash */
async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** 密码 verify (不区分大小写: bcrypt 内部处理) */
async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

// ==================== JWT ====================

/** 签发 access token (短期, 含完整用户身份) */
function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role || 'user',
      type: 'access'
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
}

/** 签发 refresh token (长期, 只含 user id + jti 用于轮换) */
function signRefreshToken(user) {
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign(
    { sub: user.id, jti, type: 'refresh' },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: REFRESH_TOKEN_TTL,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
  return { token, jti };
}

/** verify token (返回 payload 或抛 Error 带 statusCode) */
function verifyToken(token) {
  if (!token) {
    const err = new Error('缺少 token');
    err.statusCode = 401;
    throw err;
  }
  try {
    // 显式 algorithms 数组防 alg 替换
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (err) {
    const e = new Error('token 无效或已过期');
    e.statusCode = 401;
    e.cause = err;
    throw e;
  }
}

// ==================== Cookie 工具 ====================

/** 设置 access + refresh + csrf 三个 cookie (登录/刷新时调用) */
function setAuthCookies(res, user, req) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken } = signRefreshToken(user);
  const csrfToken = crypto.randomBytes(32).toString('hex');

  const isProd = process.env.NODE_ENV === 'production';
  const baseOpts = {
    httpOnly: true,
    secure: isProd,                // HTTPS only in prod
    sameSite: 'lax',               // OWASP 推荐: Lax + double-submit
    path: '/'
  };

  res.cookie(COOKIE_ACCESS, accessToken, {
    ...baseOpts,
    maxAge: 60 * 60 * 1000         // 1h
  });
  res.cookie(COOKIE_REFRESH, refreshToken, {
    ...baseOpts,
    maxAge: CSRF_TOKEN_TTL_MS      // 30d
  });
  // CSRF cookie: 浏览器 JS 可读, 用于提交时塞到 X-CSRF-Token 头
  res.cookie(COOKIE_CSRF, csrfToken, {
    ...isProd ? { secure: true } : {},
    httpOnly: false,               // 关键: 浏览器 JS 能读
    sameSite: 'lax',
    path: '/',
    maxAge: CSRF_TOKEN_TTL_MS
  });

  return { accessToken, refreshToken, csrfToken };
}

/** 清除所有 auth cookie (登出时调用) */
function clearAuthCookies(res) {
  const opts = { path: '/' };
  res.clearCookie(COOKIE_ACCESS, opts);
  res.clearCookie(COOKIE_REFRESH, opts);
  res.clearCookie(COOKIE_CSRF, opts);
}

// ==================== Express 中间件 ====================

/** 从 cookie 提取 access token, 验签后把 user 信息挂到 req.user */
function attachUser(req, res, next) {
  const token = req.cookies?.[COOKIE_ACCESS];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      req.user = null;
      return next();
    }
    req.user = {
      id: payload.sub,
      username: payload.username,
      displayName: payload.displayName || payload.username, // 兼容老 token
      role: payload.role
    };
  } catch {
    req.user = null;
  }
  next();
}

/** 强制要求登录 (挂到所有业务 API 上) */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  next();
}

/** CSRF 防护: 写操作要求 X-CSRF-Token 头 与 cookie 一致 */
function csrfProtection(req, res, next) {
  // 安全方法 (GET/HEAD/OPTIONS) 跳过
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieToken = req.cookies?.[COOKIE_CSRF];
  const headerToken = req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: '缺少 CSRF token' });
  }
  // 长度相同则用 timingSafeEqual 防止时序攻击
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'CSRF token 不匹配' });
  }
  next();
}

/** 登录限流: 10 次/15 分钟/IP (F2 决策, 防密码爆破) */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '登录尝试过多, 请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  // 跳过健康探测, 避免 304/200 也计数
  skipSuccessfulRequests: false
});

/** 检查用户是否被锁 */
function checkAccountLocked(user) {
  if (user && user.isLocked) {
    const err = new Error('账号已被锁定, 请联系管理员');
    err.statusCode = 403;
    throw err;
  }
}

module.exports = {
  // 配置
  requireJwtSecret,
  JWT_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  COOKIE_CSRF,
  // 密码
  hashPassword,
  verifyPassword,
  // JWT
  signAccessToken,
  signRefreshToken,
  verifyToken,
  // Cookie
  setAuthCookies,
  clearAuthCookies,
  // 中间件
  attachUser,
  requireAuth,
  csrfProtection,
  loginLimiter,
  // 业务
  checkAccountLocked
};
