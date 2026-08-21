# 06 · 认证与安全：JWT、Cookie、CSRF

> 这是面试最可能深挖的部分，也是本项目安全设计最完整的模块。
> 读完本文你应能讲清楚：Session vs JWT、双 token 轮换、CSRF 原理与防护、密码哈希、限流。

---

## 1. 认证 vs 授权（先分清概念）

- **认证（Authentication）**：你是谁？（登录验证密码）
- **授权（Authorization）**：你能干什么？（普通用户不能删别人的笔记）

本项目：JWT 解决认证，userId 条件查询解决授权。

---

## 2. Session vs JWT（必考对比题）

### Session 方案（传统）

```
登录 → 服务器存 session 记录（内存/Redis）→ 发 sessionId 给浏览器
  浏览器请求 → 带 sessionId → 服务器查 session → 知道是谁
```

问题：服务器要存状态（多台服务器要共享 session 存储）。

### JWT 方案（本项目）

```
登录 → 服务器签一个 token（含用户信息+签名）→ 发 cookie
  浏览器请求 → 带 token → 服务器验签（无状态！）→ 知道是谁
```

**JWT 结构**（三段，点号分隔）：

```
header.payload.signature
  ├─ header:    {"alg":"HS256"}       算法
  ├─ payload:   {"sub":"1","role":"user","exp":...}   数据
  └─ signature: HMAC 签名（防篡改）
```

**签名原理（面试要讲）**：`signature = HMAC(header + payload, JWT_SECRET)`。
- 服务器用 secret 验证签名 → 能确认 payload 没被改过
- 但 JWT 是**可解码的**（base64），所以**不能存敏感信息**（本项目只存 id/username/role）

### 对比表

| 维度 | Session | JWT（本项目） |
|------|---------|--------------|
| 服务器存储 | 需要 | 不需要（无状态） |
| 水平扩展 | 要共享存储 | 天然支持 |
| 登出失效 | 立刻 | 要等过期（或黑名单） |
| 安全 | 无签名问题 | 密钥泄露=全泄露 |

**面试话术**："我选 JWT 是因为后端无状态、水平扩展友好；用短 access + 长 refresh 的补偿方案弥补 JWT 无法即时失效的缺点。"

---

## 3. 双 Token 方案（本项目核心设计）

```
┌─────────────────────────────────────────────┐
│ 登录成功                                     │
│   Set-Cookie: qm_access    (JWT, 1小时)     │
│   Set-Cookie: qm_refresh   (JWT, 30天)      │
│   Set-Cookie: qm_csrf      (随机串, 30天)    │
└─────────────────────────────────────────────┘
        │
        ▼
   业务请求（带 qm_access）
        │
        ├── access 有效 ──▶ 正常处理
        │
        └── access 过期(401) ──▶ POST /api/auth/refresh
                                   ├─ 用 refresh 验签
                                   ├─ 签发新的 access + refresh
                                   └─ 浏览器重发原请求
```

### 为什么这样设计？（每个决定都能讲）

| 设计 | 原因 |
|------|------|
| access 只 1 小时 | 泄露后危害窗口小 |
| refresh 30 天 | 用户不用频繁登录 |
| refresh 每次轮换（换新） | 旧 refresh 失效，泄露后复用被拒 |
| 都放 httpOnly cookie | JS 读不到，防 XSS 窃取 token |
| 双 token 分离 | 业务请求不传 refresh，降低泄露面 |

---

## 4. Cookie 属性详解（安全关键）

```js
res.cookie(COOKIE_ACCESS, accessToken, {
  httpOnly: true,       // JS 读不到 → 防 XSS 窃取
  secure: isProd,       // 生产强制 HTTPS
  sameSite: 'lax',      // 防 CSRF（见下节）
  maxAge: 60*60*1000    // 1h
});
```

| 属性 | 作用 | 本项目值 |
|------|------|---------|
| `httpOnly` | 禁止 JS 读取，只能随请求自动带 | true |
| `secure` | 只在 HTTPS 下发送 | 生产 true |
| `sameSite: 'lax'` | 跨站请求不自动带（写操作） | lax |
| `path` | 作用域 | / |

**唯一例外**：`qm_csrf` cookie 必须 `httpOnly: false`——因为前端 JS 要读取它放进请求头（CSRF 双 token 机制）。

---

## 5. CSRF 攻击与防护（本项目最亮的点）

### 5.1 攻击原理

```
1. 你已登录 quickmark.com（浏览器里有 cookie）
2. 你打开恶意网站 evil.com
3. evil.com 里有个 <img src="http://quickmark.com/api/notes/delete/123">
4. 浏览器自动带上你的 cookie 请求 → 笔记被删！
```

Cookie 是浏览器**自动携带**的，恶意网站利用这一点发起"伪造身份的请求"。

### 5.2 本项目三重防护

**第一层：SameSite=Lax**
```js
sameSite: 'lax'   // 跨站 POST 请求不携带 cookie
```

**第二层：Double-Submit Cookie（核心）**
```js
// 后端校验：请求头 X-CSRF-Token 必须 === cookie 里的 qm_csrf
function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies?.qm_csrf;
  const headerToken = req.get('X-CSRF-Token');
  // 用 timingSafeEqual 防止时序攻击
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'CSRF token 不匹配' });
  }
  next();
}
```

**为什么有效？** 攻击者的跨站请求虽然会自动带 cookie，但**读不到 cookie 值**（同源策略），所以塞不出正确的 X-CSRF-Token 头 → 403。

**第三层：前端封装层自动加头**（api/index.js）
```js
if (method !== 'GET' && method !== 'HEAD') {
  const csrf = readCsrfCookie();   // 从 qm_csrf cookie 读
  if (csrf) opts.headers['X-CSRF-Token'] = csrf;
}
```

**面试话术**："CSRF 我用了 OWASP 推荐的 double-submit cookie 模式——攻击者可以触发请求但读不到 cookie 值，双因子校验直接拦死；配合 SameSite=Lax 双保险；比较时序用了 timingSafeEqual 防时序侧信道。"

---

## 6. 密码安全（bcrypt）

```js
const BCRYPT_ROUNDS = 8;
async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);   // 加盐哈希
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
```

### 为什么不能用 MD5/SHA-256 直接存？

- 相同密码 → 相同哈希 → 彩虹表（预计算哈希表）直接破解
- GPU 算哈希极快，可暴力穷举

### bcrypt 为什么安全？

1. **自动加盐**：每个用户哈希里带随机盐，相同密码哈希不同
2. **慢**：设计上故意慢（8 轮 ≈ 50ms），暴力破解成本被放大几百万倍
3. 哈希里同时存了盐和轮数，验证时自动提取

---

## 7. 找回密码安全设计（验证码版）

```
用户请求 → 生成 6 位验证码
  → 存 SHA-256(验证码) 到数据库（不存明文）
  → 发邮件（nodemailer + QQ SMTP）
  → 用户提交验证码 → 后端哈希对比 + 检查 5 分钟过期
  → 成功 → 改密码 → 清空验证码（一次性）
```

**安全要点（面试可以逐条讲）：**
1. 存哈希不存明文——数据库泄露拿不到验证码
2. 5 分钟过期——限制攻击窗口
3. 用完即废——防重放
4. 邮箱不存在也返回"验证码已发送"——**防账号枚举**
5. 限流 5 次/小时/IP——防邮件轰炸
6. 发送失败静默处理——不暴露内部信息

---

## 8. 防 SQL 注入（为什么 ORM 更安全）

```js
// ❌ 危险：字符串拼接
pool.query(`SELECT * FROM notes WHERE title = '${input}'`)
// 输入：' OR '1'='1  → 直接查出所有笔记！

// ✅ 安全：参数化查询（Prisma 自动）
prisma.note.findMany({ where: { title: { contains: input } } })
```

**原理**：参数化查询把"代码"和"数据"分开，输入永远被当作值处理，不可能改变 SQL 结构。

---

## 9. 安全清单总览（本项目全部覆盖）

| 威胁 | 防护 | 实现 |
|------|------|------|
| 密码泄露 | bcrypt 加盐哈希 | auth.js |
| token 伪造 | JWT 验签 + secret 必填 | auth.js |
| 算法替换攻击 | 显式 `algorithms: ['HS256']` | auth.js |
| XSS 窃取 cookie | httpOnly cookie | setAuthCookies |
| CSRF | double-submit + SameSite | csrfProtection |
| SQL 注入 | Prisma 参数化 | 全后端 |
| 密码爆破 | 登录限流 | loginLimiter |
| 邮件轰炸/枚举 | 找回密码限流 + 统一响应 | routes-auth.js |
| IDOR 越权 | 所有查询带 userId | dal.js |
| 接口扫描 | 全局限流 | apiLimiter |
| 已知漏洞 | helmet 安全头 | server.js |

---

## 10. 自测题（这章最值得背）

1. Session 和 JWT 的区别？为什么本项目选 JWT？
2. 为什么 access 短、refresh 长？refresh 轮换解决了什么问题？
3. CSRF 攻击的原理？三重防护分别是什么？
4. 为什么 qm_csrf cookie 不能设置 httpOnly？
5. bcrypt 比 MD5 安全在哪里？什么是加盐？
6. 找回密码的验证码为什么存哈希？
7. 什么是 IDOR？本项目怎么防？

下一篇 → [07-核心算法-SM2间隔重复](07-核心算法-SM2间隔重复.md)
