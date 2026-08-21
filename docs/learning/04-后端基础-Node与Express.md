# 04 · 后端基础：Node.js 与 Express

> 后端只有两个文件是"框架"——server.js（应用骨架）和各路由文件。
> 读完本文你应掌握：Node 模块系统、Express 路由与中间件、async/await 异步处理、错误处理。

---

## 1. Node.js 基础概念

### 1.1 Node 是什么？

- 让 JavaScript 脱离浏览器运行的环境（V8 引擎 + 文件/网络 API）
- **单线程 + 事件循环**：一个进程处理所有请求，靠异步 I/O 不阻塞
- 适合 I/O 密集型：数据库查询、文件读写、网络请求

### 1.2 模块系统（require）

Node 每个文件是一个模块，`module.exports` 导出，`require` 引入：

```js
// sm2.js
module.exports = { gradeCard, MIN_EF };

// review.js
const { gradeCard } = require('./sm2');
```

**require 的缓存特性**（本项目踩过大坑）：
```js
const email = require('./email');   // 第一次加载，之后都从内存缓存拿
```
改文件后同一进程内 require 不到新代码——除非 `delete require.cache`。详见项目根目录记忆文档。

### 1.3 async/await（本项目全是异步）

```js
// 数据库查询是异步的（I/O），必须 await
const user = await dal.findUserByUsername(username, prisma);
```

**面试点**：Node 单线程靠"事件循环 + 异步 I/O"实现高并发。异步函数不阻塞主线程，await 只是语法糖，底层是 Promise。

---

## 2. Express 应用骨架（server.js）

一个 Express 应用的完整生命周期：

```
1. 创建应用        const app = express();
2. 注册中间件      app.use(中间件函数);        ← 按顺序执行
3. 注册路由        app.get('/api/notes', 处理函数);
4. 启动监听        app.listen(PORT, ...);
```

### 2.1 中间件（Middleware）—— Express 的灵魂

中间件就是一个"处理请求的函数"，每个请求按注册顺序流过它们，像流水线：

```js
app.use((req, res, next) => {
  // 1. 做一些事（比如解析 body、记录日志、校验身份）
  console.log('请求来了:', req.method, req.path);
  next();   // 2. 调用 next() 交给下一个中间件
});

app.get('/api/notes', (req, res) => {
  res.json({ ok: true });   // 终点：返回响应
});
```

**本项目中间件链条（请求从外到内的顺序）**：

```
客户端请求
  │
  ▼
express.json()          # 解析 JSON body → req.body
  │
  ▼
cookieParser()          # 解析 Cookie → req.cookies
  │
  ▼
helmet()                # 安全响应头
  │
  ▼
请求日志中间件            # 记录耗时/状态码
  │
  ▼
attachUser()            # 尝试解析 token → req.user（不强制登录）
  │
  ▼
/api 全局限流            # 100 次/分钟/IP
  │
  ▼
requireAuth()           # 强制登录（白名单除外）
  │
  ▼
csrfProtection()        # 写操作校验 CSRF
  │
  ▼
具体路由处理函数          # /api/notes GET/POST 等
```

**面试话术**："Express 中间件是洋葱模型——请求一层层进来，响应一层层出去。鉴权、限流、日志都是中间件，各自职责单一，这是后端可维护性的基础。"

### 2.2 路由（Router）

业务路由拆分成独立文件（`prisma/routes-auth.js` 等），在 server.js 挂载：

```js
// server.js
app.use('/api/auth', require('./prisma/routes-auth'));     // /api/auth/login 等
app.use('/api/feedback', require('./prisma/routes-feedback'));
app.use('/api/review', require('./prisma/routes-review')); // 间隔重复
```

路由文件内部：

```js
const router = express.Router();
router.post('/login', loginLimiter, async (req, res) => { ... });
router.get('/me', (req, res) => { ... });
module.exports = router;
```

---

## 3. 一个路由的完整解剖（GET /api/notes）

```js
app.get('/api/notes', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const data = await require('./prisma/dal').listNotes(req.user.id, req.query, prisma);
      return res.json(data);
    }
    // ...旧版 pool 实现
  } catch (err) {
    handleApiError(res, err, '获取笔记列表');
  }
});
```

拆解每一行：
1. `req.user.id` — 中间件 attachUser 已经把用户信息挂上了（**鉴权的结果**）
2. `req.query` — URL 查询参数（?search=xx&category_id=3）
3. `dal.listNotes(userId, query, prisma)` — 业务逻辑放到 **dal 层**（数据访问层），路由保持薄
4. `res.json(data)` — 返回 JSON 响应
5. `try/catch + handleApiError` — 统一错误处理（500 兜底）

**分层原则**：路由层只管"收请求、发响应"，业务逻辑在 dal/review 层，测试和复用都方便。

---

## 4. 请求生命周期状态码（面试基础）

| 状态码 | 含义 | 项目场景 |
|--------|------|---------|
| 200 | 成功 | 查询、更新成功 |
| 201 | 创建成功 | 创建笔记、注册 |
| 400 | 参数错误 | 缺字段、密码太短、验证码错误 |
| 401 | 未登录/token 失效 | requireAuth 拦截 |
| 403 | 无权限/CSRF 不过 | 功能未开启、CSRF 不匹配 |
| 404 | 资源不存在 | 笔记不存在 |
| 409 | 冲突 | 用户名/邮箱已被占用 |
| 429 | 请求过多（限流） | 登录失败 5 次、注册频繁 |
| 500 | 服务器内部错误 | 数据库挂了等 |

**面试话术**："我按 REST 规范管理状态码：客户端能通过状态码区分错误类型，前端封装层统一处理——401 自动刷新 token，429 提示稍后再试。"

---

## 5. 错误处理（后端必修课）

### 5.1 统一错误处理器

```js
function handleApiError(res, err, label) {
  logger.error(`${label} 失败:`, err);
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || `${label}失败` });
}
```

技巧：业务代码里 `err.statusCode = 400; throw err;`，统一处理器读取并返回对应状态码。

### 5.2 404 处理（SPA 回退）

```js
if (fs.existsSync(distDir)) {
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
    res.sendFile(path.join(distDir, "index.html"));  // 前端路由回退
  });
}
```

**要点**：API 请求返回 JSON 404，页面请求返回 index.html（交给 Vue 路由处理）——前后端分离应用的标准做法。

### 5.3 优雅关闭

```js
process.on('SIGTERM', async () => {
  await prismaModule.disconnect();   // 断开数据库连接，不丢数据
  await cache.disconnect();
  process.exit(0);
});
```

服务器重启（pm2 restart）时触发 SIGTERM，先优雅断开再退出——避免连接未释放导致的数据异常。

---

## 6. 限流（Rate Limiting）

```js
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 分钟窗口
  max: 100,               // 最多 100 次
  message: { error: '请求过于频繁, 请稍后再试' }
});
app.use('/api', apiLimiter);
```

三层限流策略（本项目安全设计）：

| 层 | 限流 | 防什么 |
|----|------|--------|
| 全局 | 100 次/分钟/IP | 接口扫描、DoS |
| 登录 | 10 次/15 分钟/IP | 密码爆破 |
| 找回密码 | 5 次/小时/IP | 邮件轰炸、账号枚举 |

---

## 7. 日志系统（pino）

```js
const logger = require('./src/utils/logger');
logger.info('[启动] USE_PRISMA = ON (走 ORM)');
logger.warn('[找回密码] 邮件发送失败:', mailErr.message);
logger.error('请求错误:', err.message);
```

- 生产环境日志是**唯一的排错依据**（用户报问题时先看日志）
- 分级：info（正常）/ warn（可恢复问题）/ error（严重错误）
- 本项目日志带时间戳 + 颜色输出，pm2 logs 实时查看

---

## 8. 自测题

1. Express 中间件的执行顺序由什么决定？（注册顺序）
2. 为什么路由处理函数要写 async/await？（数据库是异步 I/O）
3. 一个请求从浏览器到数据库，经过了哪几层？
4. 限流为什么分三层？分别防什么？
5. `req.user` 是哪来的？（中间件 attachUser）
6. 404 时为什么页面请求返回 index.html 而不是 404 页面？（SPA 路由）

下一篇 → [05-数据库设计与Prisma](05-数据库设计与Prisma.md)
