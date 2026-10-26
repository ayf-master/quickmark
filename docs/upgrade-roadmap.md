# QuickMark 升级路线图（5 项必做）

> 目标：把 QuickMark 从"个人项目"升级为"可上线的产品"
> 范围：5 项必做（前端拆分 → 数据库迁移 → 鉴权 → 缓存 → 监控）
> 原则：每一步都保持现有功能可运行，不搞"大爆炸式重写"

---

## 实际进度快照（截至 2026-10-26）

原路线图把工作切成阶段 0–7 + P2。截至今日，**主体功能线（0–6）已全部完成**，监控线（7）完成 Pino + Sentry（env-gated）+ 健康检查增强 + pm2 日志轮转；Prometheus 指标端点尚未做。另外补了一整条"工程质量 D 线"（原路线图没规划，属上线前补课）：测试基座、CI、E2E、安全清理、分支保护。

| 原阶段 | 主题 | 现状 |
|--------|------|------|
| 0 | 配置管理 | ✅ 完成（.env + .gitignore + 启停校验 requireEnv） |
| 1 | 前端拆分 Vue3+Vite | ✅ 完成（src/ 多 SFC + Vite 工程） |
| 2 | 数据库迁移工具 | ✅ 完成（Prisma + prisma/migrations/） |
| 3 | ORM 替换直写 SQL | ✅ 完成（prisma/dal.js，双轨 pool 回退保留） |
| 4 | 鉴权 + 安全 | ✅ 完成（users 表 + JWT + helmet + rate-limit + CSRF） |
| 5 | 旧数据迁移 + 收尾 | ✅ 完成（owner_id 归属，legacy 关闭） |
| 6 | 缓存 Redis | ✅ 完成（src/utils/cache.js + ioredis，优雅降级） |
| 7 | 监控 / 日志 | 🟡 部分：Pino ✅、Sentry(env-gated) ✅、健康检查增强 ✅、pm2 日志轮转 ✅；Prometheus 指标端点 ⬜ |

### 工程质量 D 线（原路线图未规划，上线前补课，已全部完成）
- **D1 测试基座**：Vitest 80 个单测 + happy-dom；`pool:'vmForks'` 解决沙箱 RPC 阻塞。
- **D2 CI 门禁**：GitHub Actions `ci.yml`，`npm ci` → prisma generate → vitest → SM-2 → build → Playwright → 上传 dist 产物；Playwright 走国内镜像加速。
- **D3 E2E**：Playwright 桌面(1440×900)+手机(Pixel 5) 双视口，7 个用例（登录 / 自动保存 / 桌面拖拽 / 移动长按），接口全 mock。
- **D4 可观测性**：后端 Sentry（仅 `SENTRY_DSN` 存在时启用，无 DSN 零开销）；`/api/health` 增强（db 状态 / uptime / version / timestamp，DB 挂返回 500 让 LB 判死）；服务器 `pm2-logrotate`（10M 轮转、保留 30、压缩）。
- **安全清理（公开仓库前）**：仓库内硬编码密钥清零；生产 DB 密码 + QQ SMTP 授权码已轮换；`.env` 不入库。
- **分支保护**：master 已开保护（强制 PR + CI 通过 + 管理员也遵守，禁止强推 / 删分支）。

> 启用提示：Sentry 需在 `.env` 配 `SENTRY_DSN` 才会真正上报（未配则全程 no-op，不影响性能）；Prometheus 指标端点（`/metrics`）是阶段 7 里唯一未做的项，需要时再补 `prom-client`。

---

## 项目现状（基线）

- **后端**：Node.js + Express 4.18，`server.js` 421 行，14 个 API 端点
- **数据库**：MySQL（mysql2/promise），库名 `quickmark`，字符集 `utf8mb4`
- **依赖**：cors / express / multer / mysql2（4 个，无构建工具、无 ORM）
- **认证**：**无**（任何人都能访问所有 API）
- **配置**：密码硬编码在 `server.js:13`（`你的数据库密码`）
- **迁移**：仅 `db/init.js`（一次性建库，schema.sql 是一坨 SQL）
- **前端**：800+ 行的 `note-editor.js` 单文件（模板/setup/style 全混）
- **部署**：单机 `node server.js` + nohup

**关键约束**：现有 14 个 API 端点**不能破坏**，前端拆分时要保证 API 100% 兼容。

---

## 5 项总览

| 阶段 | 主题 | 预计工作量 | 关键产出 | 阻塞/前置 |
|------|------|-----------|---------|----------|
| 0 | 前置：配置管理 | 0.5 天 | `.env` 化 + 密码不入库 | 无 |
| 1 | 前端拆分（Vue 3 + Vite） | 3 天 | 5 个 `.vue` 组件 + Vite 工程 | 0 |
| 2 | 数据库迁移工具 | 1.5 天 | `prisma/` 目录 + `npm run migrate` | 0 |
| 3 | ORM 替换直写 SQL | 3 天 | `models/` 目录 + 14 个 API 重写 | 2 |
| 4 | 鉴权 + 安全 | 3 天 | users 表 + JWT + middleware | 2, 3 |
| 5 | 关联数据迁移 + 收尾 | 1.5 天 | 旧笔记归属 `owner_id` | 4 |
| 6 | 缓存（Redis） | 1.5 天 | 分类树 + 热门笔记缓存层 | 3, 4 |
| 7 | 监控 / 日志 | 1.5 天 | Pino + Sentry + 指标 | 5, 6 |
| **合计** | | **~15 天** | | |

---

## 阶段 0：配置管理（0.5 天）

**目标**：密码、密钥不进 git，环境变量集中管理

### 任务
- [ ] `npm install dotenv`
- [ ] 创建 `.env.example`（示例，可入库，值为空）
- [ ] 创建 `.env`（本地真实配置，加入 `.gitignore`）
- [ ] `server.js:13` 硬编码密码改成 `process.env.DB_PASSWORD`
- [ ] `server.js:12` 的 `host/user` 也都改环境变量化
- [ ] `server.js` 顶部加 `require('dotenv').config()`
- [ ] `db/init.js` 同样改造

### 验收
- `rm -rf node_modules && npm install && npm start` 能跑起来
- 改 `.env` 重启生效
- `git log -p server.js | grep -i password` 找不到明文

### 风险
- 低，纯配置改动

---

## 阶段 1：前端拆分（Vue 3 + Vite）— 3 天

**目标**：把 800 行 `note-editor.js` 拆成多个 `.vue` SFC，工程化打包

### 选型
- **构建工具**：**Vite 5**（零配置 HMR，启动快）
- **Vue**：**3.4+ Composition API**（已用）
- **包管理**：**pnpm**（节省空间，比 npm 快 3 倍）
- **状态管理**：**Pinia**（替代当前的全局 `store.js`）

### 目录结构
```
public/                          ← 旧静态文件（阶段 1 完成后废弃）
src/
  main.js                        ← Vue 入口
  App.vue
  comps/
    Sidebar.vue                  ← 侧边栏
    NoteList.vue                 ← 笔记列表
    NoteEditor.vue               ← 笔记编辑器
    CategoryTree.vue             ← 分类树
    Toolbar.vue                  ← Markdown 工具栏
  stores/
    notes.js                     ← Pinia store（笔记）
    categories.js                ← Pinia store（分类）
    ui.js                        ← Pinia store（UI 状态）
  utils/
    markdown.js                  ← markdown-it 封装
    api.js                       ← fetch 封装
  router/                        ← 暂用 hash 路由，阶段 4 鉴权后改 history
  style.css                      ← 全局样式
index.html                       ← 移到根目录
vite.config.js
package.json
```

### 任务
- [ ] 装 Vite：`npm install -D vite @vitejs/plugin-vue`
- [ ] 装 Pinia：`npm install pinia`
- [ ] 装 vue-loader（如果用 SFC）
- [ ] 创建 `vite.config.js`，配 dev server 代理到 `:3000`
- [ ] 把 `note-editor.js` 的 4 部分拆出来：
  - 模板 → `NoteEditor.vue` 的 `<template>`
  - `<script setup>` → `NoteEditor.vue` 的 `<script setup>`
  - `<style>` → 拆成 `NoteEditor.vue` 的 `<style scoped>` + 全局 CSS
  - 工具函数 → `utils/markdown.js`
- [ ] 把 `public/js/store.js` 拆成 `src/stores/notes.js` + `categories.js` + `ui.js`
- [ ] 把 `public/js/api.js` 改成 `src/utils/api.js`，加 JWT 拦截器（阶段 4 用）
- [ ] 拆分其它组件（`sidebar.js` → `Sidebar.vue` 等）
- [ ] 配置 `npm run dev` / `npm run build`
- [ ] **关键**：`/api/*` 请求保持原样（地址、参数、返回结构完全不变）

### 验收
- `npm run dev` 起 Vite dev server（默认 5173），浏览器打开能正常使用
- `npm run build` 产出 `dist/`，`node server.js` 托管 `dist/` 也能用
- 所有 14 个 API 调用方式**不变**
- Edge headless `#test` 自检通过
- 编辑器所有功能：Markdown 预览、工具栏、代码块、行号、保存、模式切换**全部**工作

### 风险
- **高**：800 行文件拆分容易漏掉闭包、副作用、样式作用域
- **缓解**：每拆一个组件立刻跑 `#test` 验证，不要一次拆完再测
- **避坑**：模板里所有 `\u0060` / `&lt;` 转义都要在 .vue 里**显式**写出来，vue-loader 不会自动处理

---

## 阶段 2：数据库迁移工具（1.5 天）

**目标**：schema 变更可追踪、可回滚

### 选型对比

| 工具 | 优势 | 劣势 | 推荐度 |
|------|------|------|-------|
| **Prisma Migrate** | 类型安全，自带 Studio GUI | 跟 Prisma ORM 绑定 | ⭐⭐⭐⭐⭐（如果阶段 3 选 Prisma） |
| **Knex** | 仅 query builder + 迁移 | 无 model 关系 | ⭐⭐⭐（如果阶段 3 选 Knex） |
| **Drizzle Kit** | 跟 Drizzle ORM 配，零运行时 | 生态小 | ⭐⭐⭐⭐（如果阶段 3 选 Drizzle） |

### 推荐：**Prisma Migrate**（阶段 3 ORM 选 Prisma，迁移工具不重复装）

### 任务
- [ ] `npm install -D prisma`
- [ ] `npx prisma init`，生成 `prisma/schema.prisma`
- [ ] 把 `db/schema.sql` 翻译成 Prisma schema（先复制一份 `prisma/schema.prisma` 留档）
- [ ] `npx prisma migrate dev --name init` 生成第一个迁移
- [ ] 迁移文件落到 `prisma/migrations/20260625120000_init/`
- [ ] 加 npm script：`"migrate": "prisma migrate deploy"` / `"migrate:dev": "prisma migrate dev"`
- [ ] 保留 `db/init.js` 作为"无库时应急入口"（调用 `prisma migrate deploy`）

### 验收
- `npx prisma migrate reset` 完整跑一遍能恢复
- 新建空库后 `npm run migrate` 能建出所有表
- `prisma studio` 能看到所有数据

### 风险
- 中，`schema.sql` 拆分要保证幂等
- 现有 `db/schema.sql` 必须保留到迁移验证通过才能删

---

## 阶段 3：ORM 替换直写 SQL（3 天）

**目标**：`server.js` 里的 SQL 全部用 ORM，14 个端点迁移完

### 推荐：**Prisma**（与阶段 2 配套）

#### 任务
- [ ] `npm install @prisma/client`
- [ ] 创建 `models/` 目录，每个表一个文件：
  - `models/category.js`
  - `models/note.js`
  - `models/note-category.js`
  - `models/upload.js`（multer 上传的文件元信息）
- [ ] 每个文件导出 `{ findAll, findById, create, update, remove }` 包装 Prisma
- [ ] 改造 `server.js` 14 个 API：
  - `app.get('/api/categories', ...)` 用 `categoryModel.findAllWithCount()`
  - `app.get('/api/notes', ...)` 用 `noteModel.findMany({ where, include })`
  - `app.get('/api/notes/:id', ...)` 用 `noteModel.findById`
  - `app.post('/api/notes', ...)` 用 `noteModel.create`
  - `app.put('/api/notes/:id', ...)` 用 `noteModel.update`
  - `app.delete('/api/notes/:id', ...)` 用 `noteModel.remove`
  - （categories 的 4 个 CRUD 同理）
- [ ] 删掉 `getCategoryNoteCounts` 里的手写 SQL，用 Prisma 嵌套 include

#### 验收
- 所有 14 个 API 行为**与现状完全一致**
- Edge headless 端到端测试全通过
- `server.js` 里的 `pool.query(...)` 数量从 ~20 处降到 0

#### 风险
- 中，关联查询（note + categories 多对多）Prisma 写法跟 SQL 不一样
- 性能：Prisma 比直写 SQL 慢 ~10-20%，当前规模无感

---

## 阶段 4：鉴权 + 安全（3 天）

**目标**：用户系统 + JWT + 防御中间件

### 4.1 选型

| 组件 | 推荐 | 备选 |
|------|------|------|
| 密码哈希 | **bcrypt**（10 rounds） | argon2 |
| Token | **JWT**（jsonwebtoken，HS256） | Session + Redis |
| 防御中间件 | **helmet**（默认开启） | 自写 |
| 速率限制 | **express-rate-limit** | - |
| 跨域 | **cors**（已装） | - |

### 4.2 任务

#### 数据模型（加 users 表）
```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String   @map("password_hash")
  displayName  String?  @map("display_name")
  createdAt    DateTime @default(now()) @map("created_at")
  notes        Note[]
  categories   Category[]
  @@map("users")
}
```

#### Note / Category 加 `ownerId`
```prisma
model Note {
  // ... 现有字段
  ownerId Int  @map("owner_id")
  owner   User @relation(fields: [ownerId], references: [id])
  @@index([ownerId])
}
```

#### API 端点
- [ ] `POST /api/auth/register` — 注册（bcrypt hash 密码）
- [ ] `POST /api/auth/login` — 登录（返回 JWT）
- [ ] `POST /api/auth/logout` — 登出（前端删 token，可选）
- [ ] `GET  /api/auth/me` — 当前用户信息

#### 中间件
- [ ] `middleware/auth.js` — 验证 `Authorization: Bearer <token>` 头
- [ ] `middleware/rateLimit.js` — 登录 5/min，注册 3/hour
- [ ] `server.js` 顶部加 `app.use(helmet())`
- [ ] 14 个业务 API 全加 `authMiddleware`

#### 前端
- [ ] 新建 `src/views/Login.vue` / `Register.vue`
- [ ] `src/utils/api.js` 加 JWT 拦截器（401 自动跳登录）
- [ ] `src/stores/user.js` 存当前用户 + token（localStorage 持久化）
- [ ] 路由守卫（hash 路由版）

### 验收
- 没 token 访问 `/api/notes` → 401
- 错密码登录 → 401，密码 hash 验证耗时 < 200ms
- 同一 IP 1 分钟内连发 6 次登录 → 429
- 注册后自动登录，跳到首页
- **关键**：所有原有功能（CRUD、Markdown 预览、分类树、文件上传）正常

### 风险
- **高**：鉴权一旦上线，**所有前端调用都要带 token**，UI 也要改登录页
- 现有 14 个 API 都要加 `authMiddleware`，漏一个就有安全洞
- **缓解**：先做"双模式"（带 `?legacy=1` 跳过鉴权），等前端改造完再关闭

---

## 阶段 5：关联数据迁移 + 收尾（1.5 天）

**目标**：把"无主笔记"挂到第一个用户下，关闭 legacy 模式

### 任务
- [ ] 写一次性脚本 `scripts/assign-existing-notes.js`：
  - 如果有用户 → 全部分给第一个用户
  - 如果没用户 → 创建占位用户 `admin@local`，密码随机
- [ ] 跑脚本，验证所有笔记都有 `ownerId`
- [ ] 关掉 `?legacy=1` 旁路
- [ ] 删 `server.js:13` 等历史遗留
- [ ] 文档：`docs/MIGRATION.md`（用户怎么从旧版本升级）

### 验收
- 数据库 100% 笔记都有 `ownerId`
- 任何没 token 的 API 调用都返回 401
- 旧用户笔记数据完整

### 风险
- 中，迁移脚本必须能**幂等**（重复跑不报错）

---

## 阶段 6：缓存（Redis）— 1.5 天

**目标**：减轻 MySQL 压力，分类树 / 热门笔记 5 分钟内有效

### 选型
- **Redis 7**（本地 docker 或云服务）
- **ioredis**（Node 客户端，支持 cluster）
- **keyv**（统一缓存抽象，方便换驱动）

### 任务
- [ ] `docker run -d -p 6379:6379 redis:7-alpine`
- [ ] `npm install ioredis`
- [ ] `src/utils/cache.js` 封装 `get/set/del/wrap`
- [ ] 缓存策略：
  - **分类树**（含 note_count）：key=`cat_tree:user:{userId}`，TTL 5 分钟
  - **笔记详情**：key=`note:{id}`，TTL 10 分钟
  - **热门笔记**（按访问频次）：key=`hot_notes:user:{userId}`，TTL 5 分钟
- [ ] 写操作时**主动失效**（POST/PUT/DELETE 笔记 → 删 `note:{id}` + `cat_tree:user:{userId}`）
- [ ] 加 npm script：`"redis:up": "docker run -d ..."`

### 验收
- 第二次访问分类树耗时 < 5ms（缓存命中）
- 写操作后下次读拿到最新数据（缓存已失效）
- Redis 不可用时**优雅降级**（直接查 MySQL，不报错）

### 风险
- 低，缓存层加在 model 外，应用代码无感知
- **避坑**：用户隔离（key 必须带 userId），否则会泄露

---

## 阶段 7：监控 / 日志（1.5 天）

**目标**：上线后能立刻发现 / 定位 / 报警问题

### 选型

| 组件 | 推荐 | 备选 |
|------|------|------|
| 日志 | **Pino**（结构化，性能第一） | Winston（生态大但慢） |
| 错误追踪 | **Sentry**（前端 + 后端 SDK） | GlitchTip（自托管） |
| 指标 | **prom-client** + Prometheus | OpenTelemetry |
| 仪表盘 | **Grafana** | Datadog（贵） |

### 7.1 日志（Pino）

#### 任务
- [ ] `npm install pino pino-pretty`
- [ ] 创建 `src/utils/logger.js`：
  - 生产环境 JSON 格式
  - 开发环境 pino-pretty 彩色输出
- [ ] 替换 `server.js` 里所有 `console.log/error` → `logger.info/error`
- [ ] 加 `req.log` 请求日志中间件

#### 验收
- 每条 HTTP 请求都有结构化日志（method / url / status / duration）
- 生产环境日志是 JSON（方便 ELK / Loki 采集）

### 7.2 错误追踪（Sentry）

#### 任务
- [ ] 注册 Sentry 账号，建项目
- [ ] `npm install @sentry/node @sentry/vue`
- [ ] 后端 `server.js` 启动时 init Sentry
- [ ] 前端 `main.js` init Sentry Vue
- [ ] 全局 `try/catch` 上报 + unhandledRejection 兜底

#### 验收
- 故意 throw 一个错 → Sentry dashboard 5 秒内看到
- 前后端报错都能上报

### 7.3 指标（Prometheus）

#### 任务
- [ ] `npm install prom-client`
- [ ] 创建 `src/utils/metrics.js`：
  - 默认指标（CPU / 内存 / event loop lag）
  - 自定义：HTTP 请求计数、API 延迟、笔记数、用户数
- [ ] `GET /metrics` 端点（Prometheus 抓取）
- [ ] `docker run -d -p 9090:9090 prom/prometheus`
- [ ] Grafana 加 panel（HTTP QPS / 错误率 / 慢接口）

#### 验收
- `curl localhost:3000/metrics` 返回 Prometheus 格式
- Grafana 看到 4 个核心面板：QPS、错误率、P99 延迟、内存

### 风险
- 低，纯加法，不改业务逻辑
- **避坑**：日志里**不能**含密码 / token 等敏感字段

---

## 阶段依赖图

```
0 (配置)
  ├── 1 (前端)
  └── 2 (迁移工具)
        └── 3 (ORM)
              ├── 4 (鉴权) ─── 5 (旧数据迁移)
              └── 6 (缓存)
                    └── 7 (监控)
```

**串行**链路：0 → 1 → 2 → 3 → 4 → 5
**并行**可能：4 跟 6 可以同时做（鉴权和缓存独立），但都依赖 3

---

## 总验收标准（全部阶段完成后）

- [ ] `npm install && npm run migrate && npm run dev` 一条命令起项目
- [ ] 没 token 访问任何 API → 401
- [ ] 注册 → 登录 → 创建笔记 → 编辑 → 删除 → 全流程通
- [ ] 分类树加载 < 50ms（缓存命中）
- [ ] 故意 throw 错 → Sentry 5 秒内看到
- [ ] `GET /metrics` 返回 Prometheus 格式
- [ ] `npm run build` 产出 < 1MB 的 dist/
- [ ] Edge headless `#test` 100% 通过
- [ ] 没有 hardcoded 密码
- [ ] 没有 `pool.query(...)`（全部走 ORM）

---

## P2（不在这 5 项里）

- 多人协作编辑（Y.js）
- 全文搜索（Meilisearch）
- 移动端 PWA
- ~~CI/CD（GitHub Actions）~~ → ✅ 已完成（见 D2）
- Docker Compose 部署文件 → ✅ 已有（docker-compose.yml）
- README / 用户文档
- Prometheus 指标端点 `/metrics`（阶段 7 唯一未做项）

做完主体 + D 线后，按上面优先级排 P2。
