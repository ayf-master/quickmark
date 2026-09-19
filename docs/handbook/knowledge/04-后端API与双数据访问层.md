# 04 · 后端 API 与双数据访问层

> 目标：看懂 `server.js` 的请求处理链，以及 `dal.js` 如何用「双实现 + 统一映射」同时支持原生池和 Prisma。

## 4.1 server.js 中间件链（执行顺序就是安全顺序）

```js
// server.js（链路精简）
requireEnv('DB_PASSWORD');     // 缺密码直接启动失败，fail-fast
requireJwtSecret();            // JWT_SECRET < 32 字符启动失败

app.use(helmet());             // 安全响应头（CSP 关闭，因要内联 SVG/style）
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));   // 大图片 base64 也能收
app.use(attachUser);           // 解析 Cookie 里的 access token → req.user（不阻断）

app.use('/api/auth', authRouter);
app.use('/api/feedback', feedbackRouter);
app.use(rateLimit({ windowMs: 60000, max: 100 }));  // 全局 100 次/分钟/IP

if (USE_PRISMA) {
  app.use('/api', requireAuth);          // 除白名单外都要登录
  app.use('/api', csrfProtection);       // 写操作校验 CSRF
}
// 静态资源 + SPA 回退
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static('dist'));
app.get('*', (req, res) => res.sendFile('dist/index.html'));  // history 回退
```

**顺序很关键**：`attachUser` 先跑（即使没登录也继续），然后才是 `requireAuth` 拦截未登录请求。`/api/auth` 与 `/health` 在白名单里，不受 `requireAuth` 限制。

## 4.2 笔记路由示例

```js
// GET /api/notes?category_id=&search=&pinned=
app.get('/notes', async (req, res) => {
  const { categoryId, search, pinned } = req.query;
  const notes = await dal.listNotes(req.user.id, {
    categoryId: categoryId ? Number(categoryId) : undefined,
    search: search || undefined,
    pinned: pinned === '1'
  });
  res.json(notes);
});

app.put('/notes/:id', async (req, res) => {
  // userId 来自已认证的 req.user，攻击者改不了
  const note = await dal.updateNote(req.user.id, Number(req.params.id), req.body);
  res.json(note);
});
```

`req.user.id` 来自 `attachUser` 解析的 Cookie，确保**永远以当前登录用户身份查库**——与 DAL 的 `userId` 首参配合，构成双保险。

## 4.3 双数据访问层：USE_PRISMA 开关

`dal.js` 顶部：

```js
const USE_PRISMA = process.env.USE_PRISMA === '1';
// 原生池路径：
const pool = mysql.createPool({ host, user, password, database, waitForConnections: true });
// Prisma 路径：
const prisma = new PrismaClient();
```

每个导出函数内部按开关选实现，但**返回结构一致**（都过 `formatNote`）：

```js
async function listNotes(userId, opts) {
  return USE_PRISMA
    ? listNotesPrisma(userId, opts)
    : listNotesPool(userId, opts);
}
```

**为什么双实现？**
- 原生 `mysql2` 池：本地开发、需要精细控制 SQL（如 FULLTEXT 中文检索），延迟低。
- Prisma：生产环境类型安全、迁移方便、关联处理稳健。
- 两条路返回字段完全一致，路由层、前端零改动切换。

## 4.4 getDescendantIds：BFS 取分类所有后代

删分类或统计时需要「这个分类及其全部子孙」。用广度优先遍历，避免递归爆栈：

```js
function getDescendantIds(categoryId, allCats) {
  const result = new Set([categoryId]);
  const queue = [categoryId];
  while (queue.length) {
    const cur = queue.shift();
    for (const c of allCats) {
      if (c.parentId === cur && !result.has(c.id)) {
        result.add(c.id);
        queue.push(c.id);
      }
    }
  }
  return [...result];
}
```

## 4.5 分类笔记计数（树形侧栏红点）

```js
async function getCategoryNoteCounts(userId) {
  const [rows] = await pool.query(`
    SELECT c.id, COUNT(nc.note_id) AS cnt
    FROM categories c
    LEFT JOIN note_categories nc ON nc.category_id = c.id
    WHERE c.user_id = ?
    GROUP BY c.id`, [userId]);
  return Object.fromEntries(rows.map(r => [r.id, r.cnt]));
}
```

注意 `LEFT JOIN` + `COUNT`：空分类也返回 0，不会漏。

## 4.6 搜索：FULLTEXT + ngram 中文分词 + LIKE 兜底

MySQL 8 的 `FULLTEXT` 配合 `ngram` parser 才能正确分词中文（`mysql:8.0` 镜像已配）。但 `ngram` 对极短词（1-2 字）可能失灵，所以加 LIKE 兜底：

```js
async function searchNoteIds(userId, q) {
  try {
    const [rows] = await pool.query(`
      SELECT id FROM notes
      WHERE user_id = ? AND MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)`,
      [userId, q]);
    if (rows.length) return rows.map(r => r.id);
  } catch (e) { /* ngram 异常时落到 LIKE */ }

  const [rows2] = await pool.query(
    `SELECT id FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?)`,
    [userId, `%${q}%`, `%${q}%`]);
  return rows2.map(r => r.id);
}
```

**原理**：`ngram` 把「计算机科学」切成「计算/算机/机科/科学」等 2-gram，中文搜索召回率高；LIKE 是保底，保证任何长度关键词都能搜到。

## 4.7 本篇知识点小结

- 中间件顺序 = 安全顺序：`attachUser` → `requireAuth` → `csrfProtection` → 路由。
- `req.user.id` 是唯一身份来源，攻击者无法越权。
- DAL 双实现（原生池 / Prisma）由 `USE_PRISMA` 切换，返回统一结构。
- BFS 取后代、LEFT JOIN 计数、FULLTEXT ngram + LIKE 兜底——都是「正确且稳健」的 SQL 写法。
