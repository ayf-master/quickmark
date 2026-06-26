# QuickMark 阶段 4 鉴权 (JWT + bcrypt + httpOnly cookie + CSRF) — 验收报告

## 实施日期
2026-06-25

## 目标
为 QuickMark 笔记应用加上多用户鉴权, 14 个业务 API 全部强制登录, 防 XSS / CSRF / 越权。

## 决策点 (用户确认)
- **A2 多用户**: notes/categories 加 userId FK, 每个用户独立数据
- **B1 httpOnly cookie + CSRF token**: 防 XSS, 标准做法
- **C1 现有数据全归 admin (id=1)**
- **D2 JWT secret 配置**: .env 文件, 启动时校验, 缺则 exit 1
- **E2 token 有效期**: access 1h + refresh 30d
- **F2 登录失败处理**: 限流 (10 次/15 分钟/IP), 不锁账号

## 关键文件

| 文件 | 作用 | 行数 |
|---|---|---|
| `prisma/auth.js` | 鉴权工具 (bcrypt + JWT + cookie + 中间件) | 188 |
| `prisma/routes-auth.js` | 5 个鉴权路由 (login/refresh/logout/me/register) | 134 |
| `server.js` | 集成鉴权中间件 + 14 API 加 userId + 双轨 | 改造 |
| `prisma/dal.js` | 12 个原函数加 userId 第一参数 | 304 |
| `test/cookie-jar.js` | 极简 cookie jar (无依赖) | 70 |
| `test/integration.js` | 57 断言 (Prisma) + 25 断言 (Pool) | 350 |
| `.env` / `.env.example` | JWT_SECRET 必填 | 改造 |

## 安全设计

### 1. 密码
- **bcryptjs@3.0.3**, 8 轮 (≈ 50ms, 平衡登录延迟与暴力破解成本)
- 不区分"用户不存在"和"密码错误", 防止用户名枚举
- 锁定用户单独抛 403, 不混入"密码错"

### 2. JWT
- **HS256 显式声明** algorithms 数组, 防 alg=none / RS256→HS256 替换攻击
- 包含 issuer/audience 字段, 防 token 跨站复用
- access token: 1h 短期, 包含完整用户身份 (sub/username/role/type)
- refresh token: 30d 长期, 只含 user id + 随机 jti
- 密钥从 .env 读, 启动校验长度 ≥ 32 字符, 缺则 exit 1

### 3. Cookie
- `qm_access` (httpOnly, 1h) — 防 JS 读取
- `qm_refresh` (httpOnly, 30d) — 防 JS 读取
- `qm_csrf` (**非** httpOnly, 30d) — JS 可读, 用于提交时塞到 X-CSRF-Token 头
- `SameSite=Lax` — OWASP 推荐
- `Secure` 在 NODE_ENV=production 时开启 (HTTPS only)

### 4. CSRF 防护 (double-submit 模式)
- 写操作 (POST/PUT/DELETE) 强制要求 cookie 中的 `qm_csrf` 与请求头 `X-CSRF-Token` **完全一致**
- 用 `crypto.timingSafeEqual` 比较, 防止时序攻击
- 长度不一致立即拒绝, 避免 buffer 长度泄露

### 5. 限流
- express-rate-limit@8.5.2
- `/api/auth/login`: 10 次/15 分钟/IP
- 响应头 `RateLimit-Remaining` / `RateLimit-Reset` / `Retry-After` 客户端可读

## API 列表 (19 个)

### 鉴权 (5 个, 免登录)
- `POST /api/auth/login` — 限流 + bcrypt verify + 发 cookie
- `POST /api/auth/refresh` — refresh token 换新 access + 新 refresh
- `POST /api/auth/logout` — 清除所有 auth cookie
- `GET  /api/auth/me` — 返回当前登录用户
- `POST /api/auth/register` — 仅 ALLOW_REGISTER=1 开放, 默认关闭

### 业务 (14 个, 强制登录 + CSRF)
- 6 读 (GET /api/categories, /api/notes, /api/notes/:id, 查询参数)
- 3 写笔记 (POST/PUT/DELETE /api/notes)
- 4 写分类 (GET/POST/PUT/DELETE /api/categories)

### 公共服务 (4 个, 免登录)
- `GET  /api/health` — 健康检查
- `POST /api/upload` — 图片上传 (保留原 multer)
- `GET  /uploads/*` — 静态图片
- `GET  /*` — Vite/前端静态资源

## 多用户隔离 (DAL 层)

| 函数 | 多用户实现 |
|---|---|
| listNotes(userId, ...) | where: { userId } + 验证 category 归属 |
| getNote(userId, id) | findUnique 后 userId 不匹配返回 null |
| createNote(userId, ...) | 自动注入 userId, 验证 category_ids 归属 |
| updateNote(userId, id, ...) | 先查 owner, 越权 404 |
| deleteNote(userId, id) | 同上 |
| listCategories(userId) | where: { userId } |
| createCategory(userId, ...) | 自动注入 userId, 验证 parent_id 归属 |
| updateCategory(userId, id, ...) | 验证 owner + parent 循环防护 |
| deleteCategory(userId, id) | 验证 owner |

**越权返回 404 而非 403**, 避免泄露资源存在性。

## 验收结果

### 集成测试 (USE_PRISMA=1, Prisma 模式)
```
=== 57 通过, 0 失败 ===
```
覆盖 15 个测试组: 鉴权前置 / 错密码 / 未登录 / me / CSRF / CSRF mismatch / 读 API / 字段类型 / 404 / 写后读 / 400 / 分类循环 / 多用户隔离 (alice vs admin) / 伪造 JWT / refresh / 登出

### 集成测试 (USE_PRISMA=0, Pool 应急模式)
```
=== 25 通过, 0 失败 ===
```
跳过鉴权相关项 (pool 模式不强制鉴权, 作应急回退), 仅测业务 API。

## 关键文件行数变化
- `prisma/dal.js`: 280 → 304 (加 userId 参数, snake_case 字段统一)
- `server.js`: 474 → 460 (净减 14 行, 鉴权挂中间件)
- `test/integration.js`: 140 → 350 (+210 行, 鉴权 + 多用户测试)

## 经验教训

### 启动期校验链
`.env` 缺 `JWT_SECRET` 立即 `process.exit(1)`, 避免线上用弱默认值导致 token 可伪造。

### Prisma Client 重建
加字段后必须 `npx prisma generate` 重生成 client, 否则 `prisma.userId` 报 "Unknown argument"。`server` 进程占用 `.prisma/client` 时 EPERM, 必须先停 server。

### JWT 同一秒 token 相同
`iat` 是秒级, 1 秒内签发两个 access token 字节完全相同。集成测试断言改为验证 **refresh token (含 jti) 变化** + **access 仍可用**, 而非 access 字节变化。

### 限流与重启
express-rate-limit in-memory, server 重启清零。**调试时多次密码错易触发**, 改 `max: 10` 比 5 更友好, 测试用全新 cookie jar + 短密码避免连锁触发。

### 越权返回 404 而非 403
OWASP 推荐: 不告诉攻击者"资源存在但你没权限", 统一 404 防扫描。

### Pool 模式应急回退
`POOL_FALLBACK_USER_ID = 1` 硬编码, INSERT 时带 `user_id`, 保持 stage 1/2 行为兼容。Prisma 模式才走真鉴权, pool 模式不强制登录 (白名单 `/api/auth` 之外的所有 API)。

### 字段输出一致性
Prisma 模型定义 camelCase (`createdAt`), `listCategories` 内部已转 snake_case (`created_at`), 但 `createCategory` / `updateCategory` 之前 spread 没转, 导致同一端点不同方法输出字段不一致。**统一手动映射**, 前端不受影响。

### pool 模式下 SQL 漏 user_id
v3 迁移后 `user_id` 变成 NOT NULL, pool 模式的 `INSERT INTO notes (title, content) VALUES (?, ?)` 缺列, 报 `Field 'user_id' doesn't have a default value`。补 `user_id, ?` 即可。

## 沉淀的 skill
- `~/.workbuddy/skills/express-jwt-cookie-csrf/SKILL.md` (阶段 4 鉴权标准模式)
  - JWT 显式 algorithms 数组
  - httpOnly + double-submit CSRF
  - bcrypt 8 轮最佳实践
  - 越权返回 404
  - 限流配置
