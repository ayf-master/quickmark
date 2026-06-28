# QuickMark 项目概述

> 轻量级 Markdown 笔记应用，面向大学生和个人知识管理场景。
> 版本 1.0.0 | 仓库: [github.com/ayf-master/quickmark](https://github.com/ayf-master/quickmark) (私有)

---

## 一、项目简介

QuickMark 是一款基于 Vue 3 + Express 的全栈笔记应用，支持 Markdown 编辑、树形分类管理、多用户隔离、深色/浅色主题切换。项目从个人课程作业起步，经过 8 个阶段的系统性升级，已达到可部署的生产级质量。

**技术栈**: Vue 3 (Composition API) + Vite 5 + Tailwind CSS 3 / Express 4 + Prisma ORM + MySQL + Redis + Pino

---

## 二、核心功能

### 2.1 笔记管理

- **创建与编辑**: 支持富文本和 Markdown 双模式切换，编辑器带实时预览
- **自动保存**: 编辑内容自动保存，避免丢失
- **搜索**: 模糊匹配标题和内容（桌面端），移动端通过 AppHeader 搜索栏
- **收藏/置顶**: 支持标记收藏并过滤仅显示收藏笔记
- **图片上传**: 编辑器内支持上传图片，存储到 uploads/ 目录
- **字数统计**: 实时显示字符数、词数、预计阅读时间

### 2.2 分类系统

- **树形结构**: 分类支持无限层级嵌套，父分类展开/折叠
- **多对多关联**: 一篇笔记可归属多个分类
- **搜索分类**: 侧边栏内置分类搜索（桌面端 + 移动端）
- **颜色标识**: 每个分类可自定义颜色标记
- **级联操作**: 删除分类时自动处理关联关系

### 2.3 用户系统

- **注册与登录**: 用户名 + 密码注册，JWT Token 鉴权
- **数据隔离**: 每个用户独立管理自己的笔记和分类
- **角色控制**: 支持 admin / user 两种角色
- **安全防护**: CSRF Token、Rate Limiting、Helmet 安全头、密码 bcrypt 加密

### 2.4 界面体验

- **响应式布局**: 桌面端三栏（侧边栏 + 笔记列表 + 编辑器），移动端自动切换为单栏 + 抽屉式侧边栏
- **主题切换**: 深色/浅色主题，跟随用户偏好
- **快捷键**: 完整的键盘快捷键支持（Alt+N 新建、Ctrl+S 保存等）
- **新手引导**: 空态引导和使用指南弹窗
- **Toast 通知**: 操作反馈通过底部 Toast 提示

---

## 三、技术架构

### 3.1 前端

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Vue 3.4 | Composition API + reactive() 单例 Store |
| 构建 | Vite 5 | 开发热更新 + 生产构建到 dist/ |
| 样式 | Tailwind CSS 3.4 | Utility-first，自定义主题变量 |
| 测试 | Vitest + @vue/test-utils | 32 个单元测试用例 |

**组件结构** (13 个 SFC):

```
App.vue
├── AppHeader.vue            顶部导航栏
├── Sidebar.vue              侧边栏（桌面固定 / 移动抽屉）
│   └── CategoryTreeNode.vue   递归分类树节点
├── NoteList.vue             笔记列表 + 搜索
│   └── NoteCard.vue         单条笔记卡片
├── NoteEditor.vue           Markdown / 富文本编辑器
├── LoginView.vue            登录页
├── CategoryDialog.vue       新建/编辑分类弹窗
├── NewNoteDialog.vue        新建笔记选分类弹窗
├── ThemeToggle.vue          主题切换按钮
├── ShortcutHelp.vue         快捷键帮助面板
├── UserGuide.vue            使用指南
└── Toast.vue                全局通知
```

### 3.2 后端

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Express 4.18 | RESTful API，575 行主入口 |
| ORM | Prisma 5.22 | 双模式切换（USE_PRISMA 环境变量） |
| 数据库 | MySQL | utf8mb4，4 张核心表 |
| 缓存 | Redis (ioredis) | 优雅降级到 MySQL 直查 |
| 日志 | Pino + pino-pretty | 结构化 JSON 日志 |
| 安全 | JWT + Helmet + Rate Limit + CSRF | 完整鉴权链路 |

### 3.3 数据库模型

```
User (users)
  id, username, email, passwordHash
  displayName, role (admin/user), isLocked
  1:N -> Note, Category

Note (notes)
  id, title, content (Text), isPinned
  userId (FK), createdAt, updatedAt
  M:N -> Category (通过 NoteCategory)

Category (categories)
  id, name, color, parentId (自引用)
  userId (FK), createdAt, updatedAt
  1:N -> children (子分类)

NoteCategory (note_categories)
  noteId + categoryId (复合主键)
```

### 3.4 部署配置

- **Docker**: 基于 node:20-slim 的 Dockerfile
- **Railway**: 已配置 railway.toml + Dockerfile 构建，Prisma Migrate 自动执行
- **本地运行**: `npm run build && npm start`，访问 localhost:3000

---

## 四、升级历程

项目从课程作业到生产级产品的 8 阶段升级路线，全部已完成：

| 阶段 | 主题 | 内容 |
|------|------|------|
| **Phase 0** | 配置管理 | 环境变量外置 (.env)，密钥不入代码库 |
| **Phase 1** | 前端重构 | Vue 3 + Vite 替代 CDN 引入模式，13 个 SFC 组件化 |
| **Phase 2** | 数据库迁移 | 引入 Prisma Migrate，版本化数据库 Schema |
| **Phase 3** | ORM 替换 | Prisma 替代手写 SQL，保留 pool 双轨回退 |
| **Phase 4** | 鉴权安全 | JWT + bcrypt + CSRF + Helmet + Rate Limit |
| **Phase 5** | 数据迁移 | 旧数据迁移到新 Schema，用户隔离 |
| **Phase 6** | 缓存层 | Redis 集成，自动降级到 MySQL |
| **Phase 7** | 监控日志 | Pino 结构化日志，请求追踪 |

---

## 五、测试覆盖

| 类型 | 工具 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest (32 用例) | Store 状态管理、Cache 工具、Content 工具 |
| 集成测试 | 自定义 HTTP 测试 | 全部 14 个 API 端点 + 鉴权 + 多用户隔离 |
| 运行模式 | test:pool / test:prisma | 双模式对比验证 |

---

## 六、当前状态 (2026-06-28)

### 已完成

- 全部 8 个升级阶段
- Railway 部署配置与验证（服务端健康，但国内网络无法访问 .up.railway.app 域名）
- 移动端 UI 优化：隐藏笔记列表搜索栏，侧边栏分类搜索两端可用

### 待推进

- **线上部署**: Railway 国内不可达，需迁移至国内可达的云平台或自有服务器
- **GitHub 同步**: 当前网络 git push 到 GitHub 超时，本地有多个未推送 commit
- **P2 功能池**: 协同编辑 (Y.js)、全文搜索 (Meilisearch)、PWA、CI/CD 管线

---

## 七、启动方式

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库（首次）
npx prisma migrate deploy

# 3. 构建前端
npm run build

# 4. 启动生产服务
npm start
# -> http://localhost:3000

# 或开发模式（前端热更新）
npm run dev
# -> http://localhost:5173（前端）+ :3000（API）
```

**环境变量** (.env 必需):

| 变量 | 说明 |
|------|------|
| DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME | MySQL 连接 |
| DATABASE_URL | Prisma 连接串 |
| JWT_SECRET | JWT 签名密钥 (>=32字符) |
| USE_PRISMA | 设为 1 启用 ORM 模式 |
| REDIS_URL | Redis 连接 (可选，缺失则降级 MySQL) |
