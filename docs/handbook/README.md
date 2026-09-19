# QuickMark 项目文档（总览）

> 面向「计算机科学与技术（师范）专业」同学的项目掌握手册。读完本目录，你将能独立讲解、复现并二次开发 QuickMark，把它写进简历。
> 本目录（`docs/handbook/`）是与代码同步的**权威文档**；`docs/learning/` 为早期学习笔记，部分内容已过时，以本目录为准。

---

## 一、项目背景与目标

QuickMark 是一个**多用户、支持 Markdown 的云端笔记应用**，定位是「个人知识管理系统」而非简单的记事本。它要解决的核心痛点：

- 笔记多了以后**难以组织**：需要分类（支持多级）、搜索、知识关联。
- 学习类笔记需要**间隔重复复习**（SM-2 算法），否则看完就忘。
- 学习/项目笔记常带有**计划与进度**（甘特图），需要可视化。
- 移动端友好：手机上要能方便地看长分类名、拖拽栏目宽度。

目标用户画像：**学生 / 自学者**。因此功能设计围绕「记 → 整理 → 复习 → 跟踪进度」闭环展开。

**产品定位一句话（可写进简历）：**
> QuickMark 是一个基于 Vue 3 + Express + Prisma 的全栈 Markdown 笔记应用，提供多租户隔离、间隔重复复习、知识图谱与可拖拽三栏编辑界面，支持 Docker 一键部署。

---

## 二、整体架构

典型的分层架构：**前端 SPA + 后端 REST API + 关系型数据库（MySQL）+ 缓存（Redis）**。

```
┌─────────────────────────────────────────────────────────────┐
│  浏览器（Vue 3 SPA）                                           │
│   src/store  (全局 reactive 单例状态)                          │
│   src/components/*  (编辑器 / 列表 / 分类树 / 图谱 / 画布 ...)   │
│   src/api  (authedFetch + CSRF 双提交)                        │
└───────────────┬───────────────────────────┬─────────────────┘
                │  HTTPS /api  (cookie 携带凭证)        │ /uploads (静态图)
                ▼                                       ▼
┌───────────────────────────────────────────┐   ┌──────────────────┐
│  Express 服务 (server.js, 端口 3000)         │   │  对象/图片存储     │
│   middleware: helmet / rateLimit / cookie    │   │  uploads/ 目录    │
│   routes: /auth /notes /categories /review   │   └──────────────────┘
│   DAL 层 (dal.js) —— 双实现开关 USE_PRISMA    │
└───────────────┬───────────────────────────┬─┘
                ▼                             ▼
        ┌──────────────┐            ┌──────────────┐
        │  MySQL 8.0   │            │  Redis 7     │
        │ (utf8mb4,    │            │ (限流计数 /   │
        │  FULLTEXT     │            │  会话缓存等)  │
        │  ngram 中文)  │            └──────────────┘
        └──────────────┘
```

**关键设计点**

1. **状态集中**：前端没有用 Pinia，而是导出一个 `reactive()` 单例对象（`src/store/index.js`）。任意组件 `import { store }` 即可读写，避免层层 props/emit。
2. **数据访问层（DAL）双实现**：`prisma/dal.js` 同时支持「原生 `mysql2` 连接池」与「Prisma ORM」两条路径，由环境变量 `USE_PRISMA` 切换（0=原生池，1=Prisma）。原生池用于本地/高频场景，Prisma 用于生产。两条路径返回字段统一映射为下划线命名（`formatNote`），**上层路由代码无需感知底层差异**。
3. **多租户隔离**：**每一个 DAL 函数第一个参数都是 `userId`**，SQL/查询里强制 `where.userId = ?`。一个用户永远读不到别人的数据，这是安全底座。
4. **认证用 HttpOnly Cookie + CSRF 双提交**：access token 存 httpOnly Cookie（JS 读不到，防 XSS 偷 token），写操作额外带 `qm_csrf` 可读 Cookie 做双重提交校验，防 CSRF。

---

## 三、技术栈

| 层 | 技术 | 版本/说明 |
|---|---|---|
| 前端框架 | Vue 3（`＜script setup＞` + Composition API） | ^3.4.21 |
| 构建工具 | Vite | ^5.2.0，含 dev proxy、 Vitest 测试 |
| 样式 | Tailwind CSS + 少量原生 CSS 变量 | ^3.4.19 |
| 前端图 | D3（`d3-force`/`d3-zoom`/`d3-drag`/`d3-selection`） | 知识图谱力导向 |
| Markdown | markdown-it + 自研插件（wiki 链接、标注） | 编辑器预览 |
| 后端 | Node.js + Express | ^4.18.2，需 Node ≥ 20 |
| ORM | Prisma + `@prisma/client` | ^5.22.0 |
| 数据库驱动 | mysql2（原生池，备选路径） | — |
| 数据库 | MySQL 8.0（`utf8mb4`，FULLTEXT ngram） | Docker `mysql:8.0` |
| 缓存 | Redis 7（ioredis） | `redis:7-alpine` |
| 认证 | jsonwebtoken（HS256）+ bcryptjs | — |
| 安全 | helmet + cookie-parser + express-rate-limit | — |
| 其他后端 | multer（上传）/ pino（日志）/ nodemailer（找回密码） | — |
| 测试 | Vitest + happy-dom | 单测纯函数与组件逻辑 |

---

## 四、核心功能模块

| 模块 | 位置 | 要点 |
|---|---|---|
| 认证 | `prisma/auth.js`、`server.js` `/api/auth` | 注册/登录/登出/找回密码；JWT 双 Cookie；bcrypt；限流 |
| 笔记 CRUD | `server.js` `/api/notes`、`dal.js` | 增删改查、拖拽排序、收藏（不置顶）、软删除 |
| 分类树 | `CategoryTreeNode.vue`、`server.js` `/api/categories` | 多级分类、循环引用防护、BFS 取后代 |
| 搜索 | `dal.js` `searchNoteIds` | FULLTEXT + ngram 中文分词，LIKE 兜底 |
| 间隔重复 | `features.js`、`/api/review` | SM-2 算法、到期卡片、复习统计 |
| 计划甘特 | `NoteEditor.vue` 内 `confirmPlan` | 计划存 `planData` JSON，不污染正文 |
| 图片上传/标注 | `ImageAnnotator.vue`、`server.js` multer | 画笔+文字标注，导出 PNG 回写 URL |
| 知识画布 | `CanvasBoard.vue` | 组块化（按分类分组的卡片墙）+ 平移缩放 |
| 知识图谱 | `KnowledgeGraph.vue` | D3 力导向，高亮当前笔记及双向链接 |
| 三栏布局 | `App.vue` + `utils/layout.js` | 可拖拽分隔条，纯函数计算宽度 |
| Wiki 链接 / 反链 | `utils/wiki-link.js`、`BacklinkPanel.vue` | `[[笔记名]]` 互链，自动算反链 |
| 编辑器自动保存 | `NoteEditor.vue` + `store` | 1s 防抖、切笔记前同步快照保存 |

---

## 五、数据流与关键流程

### 1. 一次「打开并编辑笔记」的完整链路

```
用户点击列表项
  → store.openNote(note)
      · 切笔记前 fire-and-forget 保存旧笔记 (_persistCurrentEdit)
      · 把 note 内容里的 <!-- qm-links --> 标记解析为 store.editLinks
      · 写入 store.editingNote / editTitle / editContent / editCategoryIds
  → NoteEditor.vue 绑定这些 ref，渲染 textarea
用户输入
  → watch(editTitle/editContent) → store.scheduleAutoSave()  (1s 防抖)
  → 防抖到点 → store.saveCurrentNote()
      · 去掉旧的 qm-links 标记，追加最新的 editLinks
      · API.updateNote(id, {title, content, category_ids, planData})
      · 回写本地 store.notes[i]，避免 loadNotes 覆盖
  → 后端 /api/notes/:id PUT → requireAuth + csrfProtection
      → dal.updateNote(userId, id, data)  (事务替换分类关联)
      → MySQL
```

### 2. 认证流程（登录）

```
POST /api/auth/login
  → 校验 username+passwordHash (bcrypt.compare)
  → signAccessToken(1h) + signRefreshToken(30d)
  → setAuthCookies: qm_access(httpOnly,1h) / qm_refresh(httpOnly,30d) / qm_csrf(可读,30d)
  → 之后每次请求自动带这两个 httpOnly Cookie；写操作前端额外在
    X-CSRF-Token 头带上 qm_csrf 的值，后端 timingSafeEqual 比对防 CSRF
  → 401 时前端 authedFetch 自动用 refresh 续期（单飞，防并发多次刷新）
```

### 3. 多租户隔离（贯穿所有查询）

```
DAL 函数签名永远是 (userId, ...其他参数)
  → SQL: SELECT ... WHERE user_id = ? AND ...
  → 即使某人伪造了别人的 note id，也因 userId 不匹配而返回空/报错
```

---

## 六、部署方式

详见 `knowledge/13-部署与运维.md`。要点：

- **开发**：`npm run dev`（Vite :5173）→ 代理 `/api`、`/uploads` 到 `npm start`（Express :3000）。
- **生产构建**：`npm run build` 产出 `dist/` → Express 托管静态文件 + SPA history 回退。
- **Docker**：`docker-compose.yml` 起 `db`(mysql:8) + `redis`(7) + `app`(USE_PRISMA=1)。
- **服务器（当前实测）**：MySQL/Redis 跑 Docker 容器，应用用宿主机 Node + PM2 直接跑；更新代码 `git pull` → `npm run build` → `pm2 restart quickmark`。外网需在腾讯云轻量**防火墙**放行 TCP 3000。

---

## 七、如何阅读本手册

建议顺序（循序渐进）：

1. `knowledge/01-工程化与工具链.md` — 把项目跑起来、看懂目录结构
2. `knowledge/02-前端架构与状态管理.md` — 理解全局状态怎么流转
3. `knowledge/03-数据模型与多租户隔离.md` — 数据库表与隔离原则
4. `knowledge/04-后端API与双数据访问层.md` — 后端路由与 DAL 双实现
5. `knowledge/05-认证与安全.md` — JWT/CSRF/bcrypt/限流
6. `knowledge/06-三栏可拖拽布局.md` — 纯函数布局计算
7. `knowledge/07-笔记编辑器与自动保存.md` — 编辑器与防抖保存
8. `knowledge/08-笔记列表与排序.md` — 收藏不置顶等排序细节
9. `knowledge/09-图片标注Canvas.md` — Canvas 2D 标注
10. `knowledge/10-知识画布组块化.md` — 组块化卡片墙
11. `knowledge/11-知识图谱D3力导向.md` — D3 力导向图
12. `knowledge/12-分类树与移动端长按全名.md` — 分类树与移动端适配
13. `knowledge/13-部署与运维.md` — 上线与排错
14. `简历话术与讲解清单.md` — 简历一句话、6 大亮点、面试追问应答（速查）

每个知识点文档都**独立成篇**，含可运行的代码片段与原理说明，可直接用于面试讲解。
