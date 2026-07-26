# QuickMark 学习指南

> 面向「会 Vue 3 + Vite、后端基础较弱」的同学。目标：用你熟悉的前端认知，把整个项目的**运行流程**和**核心知识点**串起来，不需要逐行抠代码，但要知道「每一块是干嘛的、改东西该去哪」。
> 阅读时对照真实文件看，理解会快很多。所有路径都是相对项目根目录。

---

## 0. 一句话概括

QuickMark 是一个**轻量级笔记应用**（类 Obsidian/Notion 极简版），支持分类树、Markdown、双向链接（Wiki Link）、知识图谱、图片上传。

它采用**前后端同仓**结构：

- **前端**：Vue 3 + Vite + Tailwind，编译产物是 `dist/` 里的一堆静态文件。
- **后端**：Node.js + Express 提供 API（`/api/*`），同时在生产环境直接托管前端的 `dist/`。

类比：前端是「浏览器里跑的 SPA」，后端是「一个提供数据接口的 Node 服务」。两者通过 HTTP（fetch）通信。

---

## 1. 技术栈全景

| 层 | 技术 | 作用 |
| --- | --- | --- |
| 前端框架 | Vue 3（组合式 API `<script setup>`） | 页面与交互 |
| 构建工具 | Vite 5 | 开发服务器 + 打包 |
| 样式 | Tailwind CSS 3 + 自定义 CSS 变量 | 原子类 + 主题色 |
| 状态管理 | Vue `reactive` 单例（**没用** Pinia/Vuex） | 全局共享状态 |
| 图形 | d3-force / d3-zoom / d3-drag | 知识图谱力导向图 |
| Markdown | markdown-it | 笔记渲染 |
| 后端框架 | Express 4 | HTTP 服务 + 路由 + 中间件 |
| 数据库 | MySQL（两种访问方式见 §6.2） | 持久化 |
| ORM | Prisma 5 | 类型安全的数据库访问（主力） |
| 缓存 | Redis（ioredis） | 分类树/笔记缓存，挂了自动降级 |
| 鉴权 | jsonwebtoken + bcryptjs + cookie | JWT + CSRF |
| 安全 | helmet / express-rate-limit | 安全头 + 限流 |
| 文件上传 | multer | 图片落到本地 `uploads/` |

---

## 2. 目录结构（你真正需要看的）

```
quickmark/
├── index.html              # 前端入口 HTML（Vite 从这里开始）
├── vite.config.js          # Vite 配置：端口、代理、@ 别名
├── package.json            # 依赖 + npm 脚本（dev/build/start…）
├── server.js               # 后端入口：Express 应用 + 所有 /api 路由
├── src/                    # ★ 前端源码（真正的 Vue 应用）
│   ├── main.js             # 前端启动入口：挂载 App、注册快捷键
│   ├── App.vue             # 根组件：登录态切换 + 整体布局
│   ├── store/index.js      # ★ 全局状态 store（重点）
│   ├── api/index.js        # ★ 所有后端请求封装（重点）
│   ├── components/         # 各个 UI 组件（NoteList/NoteEditor/Sidebar…）
│   └── utils/              # wiki 链接、markdown、缓存等工具
├── prisma/                 # ★ 后端数据层
│   ├── schema.prisma       # 数据模型定义（重点）
│   ├── auth.js             # JWT / bcrypt / cookie / CSRF（重点）
│   ├── dal.js              # 数据访问层（用 Prisma 写 SQL 逻辑）
│   ├── routes-auth.js      # 登录/注册/刷新/登出路由
│   └── client-init.js      # Prisma 客户端单例
├── db/                     # 数据库初始化 SQL
├── docs/                   # 部署/运维文档
└── dist/                   # 生产构建产物（npm run build 生成）
```

> ⚠️ 注意：根目录下还有一个 `quickmark/` **子文件夹**，里面是本项目的一份**旧副本/快照**（同样有 src/、server.js）。它不参与当前构建（Vite 用的是根目录的 `index.html` + `src/`）。**学习时忽略它，只看根目录这一层**，别被两份同名文件搞混。

---

## 3. 两种运行模式（最关键的一块）

这个项目开发和生产**跑法不同**，理解这点能少踩 80% 的坑。

### 开发模式（你日常写代码时用）
- 前端：`npm run dev` → Vite 起一个开发服务器，端口 **5173**。
- 后端：`npm start`（即 `node server.js`）→ Express 起 API 服务，端口 **3000**。
- 关键：`vite.config.js` 里配置了**代理**，浏览器访问 5173 时，所有 `/api` 和 `/uploads` 请求会被 Vite 自动转发到 3000：

```js
// vite.config.js
server: {
  port: 5173,
  proxy: {
    '/api':     { target: 'http://localhost:3000', changeOrigin: true },
    '/uploads': { target: 'http://localhost:3000', changeOrigin: true }
  }
}
```

所以前端代码里永远写 `/api/notes`，**不用关心后端端口**，Vite 帮你转。

### 生产模式（部署上线时用）
- 先 `npm run build` 把前端打包成 `dist/`。
- 再 `npm start` 启动 Express。它检测到 `dist/` 存在，就顺带用 `express.static('dist')` 把前端文件当静态资源托管了（见 `server.js` 143-147、605-614 行）。
- 此时前端 + 后端**都走 3000 一个端口**，Vite 不再参与。

> 类比：开发模式像「前端住 5173，后端住 3000，中间修座桥（代理）」；生产模式像「后端把前端打包进自己家里一起住」。

---

## 4. 一次完整请求的生命周期（以「创建笔记」为例）

这是理解全栈协作的核心。跟着箭头走一遍：

```
[浏览器] 用户在 NoteEditor 输入标题内容
   │
   ▼
[src/store/index.js] store.createNote()
   │  调用 API.createNote(payload)
   ▼
[src/api/index.js] authedFetch('POST', '/api/notes', body)
   │  fetch + credentials:'include'(带 cookie) + X-CSRF-Token 头
   ▼
(开发: Vite 5173 代理转发 → 3000)  ──→  [server.js: Express]
   │
   │  中间件链按顺序执行：
   │   1. express.json()        解析请求体 JSON
   │   2. cookieParser()        解析 cookie
   │   3. helmet()              加安全头
   │   4. attachUser 中间件     读 cookie 里的 JWT → 挂到 req.user
   │   5. rateLimit(100/min)    限流
   │   6. requireAuth + CSRF    强制登录 + 校验 CSRF（写操作）
   │
   ▼
[server.js 路由] app.post('/api/notes')
   │  USE_PRISMA=1 时转交给 prisma/dal.js
   ▼
[prisma/dal.js] createNote(userId, payload, prisma)
   │  参数校验 → Prisma 写入 MySQL → formatNote 格式化返回
   ▼
[MySQL] 数据落库
   │
   ▼ 响应原路返回 JSON
[前端] API 拿到结果 → store.notes.unshift(...) 更新界面 → 自动保存
```

记住这条链路：**组件 → store → api → 代理(Vite) → 后端中间件 → 路由 → DAL → 数据库**。以后任何功能（改笔记、删分类…）都是这套模板。

---

## 5. 前端核心知识点

### 5.1 Vue 3 单文件组件（SFC）
每个 `.vue` 文件 = 一个组件，含三段：
```vue
<template>  <!-- 结构，相当于 HTML --> </template>
<script setup>  <!-- 逻辑，组合式 API；你已熟悉 --> </script>
<style scoped> <!-- 样式，scoped 表示只作用于本组件 --> </style>
```
项目全部用 `<script setup>` 语法（你学过的），不需要 `export default`。

### 5.2 没有 vue-router：靠「登录态」切换页面
你可能会找路由配置，但**项目没用 vue-router**。整个应用是单页，`App.vue` 用 `v-if` 在「登录页 / 主界面」之间切换：

```vue
<!-- App.vue -->
<div v-if="!authChecked">加载中…</div>
<LoginView v-else-if="!loggedIn" />
<template v-else>
  <AppHeader /><Sidebar /><NoteList /><NoteEditor />
  …各种弹层
</template>
```

> 这是「轻量项目」常见做法：页面不多，没必要引路由库。笔记的「打开/关闭」只是 store 里 `editingNote` 有没有值。

### 5.3 全局状态：一个 `reactive` 单例（重点）
项目**没用 Pinia/Vuex**，而是在 `src/store/index.js` 导出一个 `reactive` 对象：

```js
import { reactive, computed, watch } from 'vue';
export const store = reactive({ /* 所有状态 + 方法 */ });
```

任何组件 `import { store } from '@/store'` 后直接用，改 `store.xxx` 界面自动更新（`reactive` 是 Vue 的响应式基础）。`computed` 做派生数据（如 `filteredNotes`、`categoryTree`），`watch` 做副作用（如标题变化触发自动保存）。

> `@` 是 Vite 别名（`vite.config.js`），指向 `src/`，所以 `@/store` = `src/store`。

### 5.4 API 层：fetch 封装 + 401 自动刷新 + CSRF
`src/api/index.js` 把所有后端调用集中在这里。两个值得学的设计：

1. **401 自动刷新**：访问令牌过期时，自动调一次 `/api/auth/refresh` 拿新令牌，再重发原请求（用 `refreshPromise` 单飞，避免并发请求重复刷新）。
2. **CSRF 双提交**：写操作（POST/PUT/DELETE）会从 cookie 读 `qm_csrf` 塞进 `X-CSRF-Token` 请求头。为什么？见 §6.5。

```js
const API = {
  async getNotes(params) { /* fetch GET /api/notes */ },
  async createNote(data) { /* fetch POST /api/notes */ },
  // …其他方法一一对应后端路由
};
export default API;
```

### 5.5 Vite 你已熟，记住三件事
- `npm run dev` 起开发服务器（含代理）；`npm run build` 产出 `dist/`。
- `@` 别名指向 `src`，`@/css` 指向根 `css/`。
- 引入 CSS（如 Tailwind）要在 `main.js` 里 `import`，Vite 才会走 PostCSS 编译。

### 5.6 主题与样式：CSS 变量 + Tailwind 混用
- 主题靠 `<html data-theme="light|dark">` + `:root` / `[data-theme=dark]` 里的 CSS 变量（`css/tokens.css`）。
- 切换主题 = 改 `data-theme` 属性（`store.toggleTheme()`）。`index.html` 里有一段内联脚本在 CSS 加载前就设好主题，**防止页面闪一下（FOUC）**。
- 复杂布局用 Tailwind 原子类，组件内细节用 `scoped` 样式。

### 5.7 自动保存
`store` 用 `watch(() => store.editContent, () => store.scheduleAutoSave())` 监听内容变化，1 秒防抖后调 `saveCurrentNote()` 写回后端。这就是「边写边存」的实现。

### 5.8 知识图谱：d3-force 力导向图
`src/components/KnowledgeGraph.vue` 用 `d3-force` 把「笔记」当节点、「双向链接」当边，自动布局成网络图。核心就是 `forceSimulation()` + 几种力（`forceLink` 连线、`forceManyBody` 斥力、`forceCenter` 居中）。数据来自 `store.graphData`（由 wiki 链接计算得出）。这是**前端直接用 SVG + d3 操作 DOM** 的例子，和 Vue 模板渲染是两套思路并存。

### 5.9 Markdown 与 Wiki 双向链接
- 笔记内容用 `markdown-it` 渲染成 HTML 预览。
- 支持 `[[笔记标题]]` 形式的 Wiki 链接，`src/utils/wiki-link.js` 解析出「哪些笔记链向哪些」，从而算出入链（backlinks）/ 出链（outlinks），并在编辑器侧边显示（BacklinkPanel）。知识图谱正是基于这套链接关系。

---

## 6. 后端核心知识点

### 6.1 Express 与中间件
`server.js` 创建一个 `app = express()`，然后**按顺序**用 `app.use(...)` 挂载中间件，再 `app.get/post/put/...` 定义路由。请求进来后**自上而下穿过所有中间件**，某个中间件调 `next()` 才继续，调 `res.json()` 就结束。

这就是 Express 的精髓：**中间件管道**。你写的鉴权、日志、限流都是管道里的一环（见 §4 的中间件链）。

### 6.2 双轨数据库：原生 SQL vs Prisma ORM
项目有个特殊设计：**同一个功能有两套实现**，靠环境变量 `USE_PRISMA` 切换。

- `USE_PRISMA=0`（默认）：`server.js` 直接用 `mysql2` 连接池 `pool.query('SELECT ...')` 写原生 SQL。
- `USE_PRISMA=1`：走 `prisma/dal.js`，用 Prisma ORM 操作数据库。

> 为什么这么设计？历史演进：先写原生 SQL，后引入 Prisma 做对比/兜底。学习时**只看 `USE_PRISMA=1` 那条线**（Prisma 是更现代、更推荐的方式），把 `server.js` 里每个路由的 `if (USE_PRISMA) { ... } else { 原生SQL }` 当成「旧实现被折叠起来了」即可。

### 6.3 Prisma 是什么（给前端同学的类比）
Prisma 是「数据库的 ORM（对象关系映射）」。类比前端：

- `prisma/schema.prisma` 像 **TypeScript 的类型定义 / 接口契约**——你用一种 DSL 描述「有 User 表、有 Note 表、它们一对多…」。
- `prisma generate` 根据 schema 生成 **类型安全的客户端**（像根据你写的 `.d.ts` 生成可用的 SDK）。
- `prisma/dal.js` 里写 `prisma.note.create({ data: {...} })`，就像调用一个带类型的函数，**不用手写 SQL 字符串**，字段名拼错会编译/运行报错。

常用命令（`package.json` 里的 `prisma:*`）：
- `prisma migrate dev` 改了 schema 后生成迁移 SQL 并应用到库（像「数据库的 git commit」）。
- `prisma studio` 打开一个网页版数据库查看器，超适合看数据。

### 6.4 数据模型与关系（重点，看 `prisma/schema.prisma`）
四张表，关系是核心：

```
User (用户)
 ├─ 1:N → Note (笔记)        userId 外键
 ├─ 1:N → Category (分类)    userId 外键
 └─ 1:N → Feedback (反馈)

Note (笔记) ⇄ Category (分类)  多对多，靠中间表 NoteCategory
Category 自引用树：parentId 指向自己 → 多级分类（父→子）
```

几个值得注意的点：
- **多对多**：一篇笔记可挂多个分类，一个分类下可有多篇笔记。中间表 `NoteCategory(noteId, categoryId)` 存关系，`@@id([noteId, categoryId])` 是联合主键。
- **自引用树**：`Category.parentId` 指向同表的 `id`，形成无限层级分类；`onDelete: Cascade` 表示删父分类时子分类自动跟着删。
- **多用户隔离**：每条笔记/分类都带 `userId`，所有查询都带 `where: { userId }`，A 用户看不到 B 用户的数据（看 `dal.js` 里每个函数第一个参数都是 `userId`）。

### 6.5 鉴权体系（重点，前端同学最需要懂）
这是项目安全性的核心，分布在 `prisma/auth.js` + `prisma/routes-auth.js` + `src/api/index.js`。拆成四件事：

**① 密码不存明文**——`bcrypt` 把密码哈希后存库（如 `passwordHash`）。登录时 `bcrypt.compare(输入, 库里哈希)` 比对。即使数据库泄露，黑客也拿不到原密码。

**② JWT（JSON Web Token）= 登录凭证**
- 登录成功后，后端签发两个 token：
  - `access_token`（1 小时有效）：带用户身份，每次请求 API 都要带。
  - `refresh_token`（30 天有效）：access 过期后用它换新的一对 token。
- 类比：access 像「当天门禁卡」，refresh 像「长期补卡凭证」。短 access 是为了**泄露后危害窗口小**。

**③ 为什么用 cookie 而不是 localStorage？**
token 通过 **HttpOnly cookie** 下发（`qm_access`/`qm_refresh`）。HttpOnly 意味着**前端 JS 读不到**——即使网站被 XSS 注入恶意脚本，也偷不到 token。前端完全不需要手动管 token，`fetch` 加 `credentials: 'include'` 浏览器自动带上。

**④ CSRF 双提交令牌（防「跨站请求伪造」）**
- 登录时后端额外发一个**非 HttpOnly** 的 `qm_csrf` cookie（JS 能读）。
- 前端每次**写操作**（POST/PUT/DELETE）必须从 cookie 读这个值，塞进 `X-CSRF-Token` 请求头（`src/api/index.js` 的 `authedFetch` 自动做）。
- 后端校验「cookie 里的 CSRF == 请求头里的 CSRF」。攻击者伪造的请求带不来这个头，就被挡住。

> 一句话：JWT 证明「你是谁」，HttpOnly cookie 防「token 被偷」，CSRF token 防「别人冒充你发请求」。

### 6.6 限流 / 安全头
- `express-rate-limit`：全局 `/api` 限 100 次/分钟/IP；登录接口单独严限 10 次/15 分钟防爆破。
- `helmet()`：自动给响应加一堆安全 HTTP 头（防嗅探、点击劫持等）。项目里关了 CSP（因为前端内联模板多），但保留了其余。

### 6.7 Redis 缓存与降级
`src/utils/cache.js` 封装了 ioredis。`dal.js` 里用 `cache.wrap('cat_tree:user:'+id, 300, async()=>{...})`：先查 Redis，没有才查 MySQL 并把结果缓存 300 秒。

关键设计：**降级**——Redis 连不上时（如本地没起 Redis），`cache.wrap` 直接走「查数据库」分支，应用照样能跑，只是没缓存加速。你本地开发没装 Redis 也不会崩。

### 6.8 文件上传
图片走 `multer` 落到本地 `uploads/`，再通过 `express.static('/uploads')` 对外提供访问。前端 `NoteEditor` 调 `/api/upload` 拿回 URL 嵌进笔记。

---

## 7. 环境变量与启动

后端靠环境变量配置，写在 `.env`（项目根）。没有就复制一份 `.env.example`（若没有就照下面建）：

```ini
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=quickmark
DATABASE_URL="mysql://root:密码@localhost:3306/quickmark"
JWT_SECRET=一串至少32位随机字符（重要！短了启动直接报错）
REDIS_URL=redis://localhost:6379
USE_PRISMA=1
NODE_ENV=development
```

常用 `npm` 脚本（`package.json`）：
| 命令 | 作用 |
| --- | --- |
| `npm install` | 装依赖（含 `postinstall` 自动 `prisma generate`） |
| `npm run dev` | 起前端开发服务器（5173） |
| `npm start` | 起后端（3000） |
| `npm run build` | 前端打包成 `dist/` |
| `npm run init-db` | 初始化数据库表 |
| `npm run prisma:studio` | 图形化看数据库 |

典型本地跑法（两个终端）：
```bash
# 终端1：后端
npm start
# 终端2：前端
npm run dev
# 浏览器开 http://localhost:5173
```

---

## 8. 推荐阅读顺序（从哪看起）

按这个顺序读，理解成本最低：

1. `index.html` → 前端从哪加载
2. `src/main.js` → 启动做了啥（挂载、主题、快捷键）
3. `src/App.vue` → 整体布局与登录态切换
4. `src/store/index.js` → 全局状态（最核心的一块前端代码）
5. `src/api/index.js` → 所有后端调用
6. `src/components/NoteEditor.vue` + `NoteList.vue` → 一个具体功能怎么串起来
7. `server.js` → 后端入口与中间件链
8. `prisma/schema.prisma` → 数据模型
9. `prisma/auth.js` → 鉴权（最有学习价值）
10. `prisma/dal.js` → 数据访问逻辑

---

## 9. 给前端同学的后端速成类比表

| 前端概念 | 后端对应 | 说明 |
| --- | --- | --- |
| `reactive` store 单例 | `prisma/client-init.js` 单例 | 全局只建一个连接 |
| 组件 `props`/`emit` 通信 | HTTP 请求/响应 | 前后端靠 JSON 通信 |
| `vite.config.js` 代理 | 反向代理（Nginx 等） | 把 `/api` 转到后端 |
| `computed` 派生数据 | SQL `JOIN` / 聚合查询 | 算 note_count 之类 |
| `watch` + 防抖自动保存 | 后端接口幂等更新 | 重复保存不会出错 |
| CSS 变量主题 | 环境变量 `.env` | 配置与环境解耦 |
| 组件按需 `import` | 中间件按需 `app.use` | 管道式组装 |

---

## 10. 小结 & 下一步

你已经知道：
- 这是**前后端同仓**项目，开发时 5173(前端)+3000(后端) 靠 Vite 代理联通，生产时后端托管 `dist/`。
- 前端是**标准 Vue 3 + Vite**，状态用 `reactive` 单例、请求集中在 `api/index.js`。
- 后端是 **Express 中间件管道**，数据走 **Prisma → MySQL**，鉴权是 **JWT + HttpOnly cookie + CSRF** 三件套。
- 数据流模板永远是：**组件 → store → api → 代理 → 中间件 → 路由 → DAL → DB**。

下一步可以挑一个功能（比如「新建分类」）**顺着第 4 节的链路自己走一遍代码**，比看十遍文档都管用。改个小样式、加个字段，是巩固理解最快的方式。

---
*文档生成于 2026-07-12，基于当前仓库代码状态。*
