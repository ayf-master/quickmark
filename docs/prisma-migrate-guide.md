# Prisma Migrate 使用指南

> QuickMark 引入 Prisma 5.22 作为数据库 schema 演进工具。
> 阶段 2 仅完成 **Migrate 工具链**，**不替换** server.js 14 个 API 的手写 SQL（留给阶段 3）。

## 1. 文件结构

```
prisma/
├── schema.prisma                    # 单一 schema 源真相 (Prisma DSL)
├── migrations/                      # 历史迁移 SQL (按时间戳命名, 永不修改已应用的)
│   └── 20260625190300_init/
│       ├── migration.sql            # Prisma diff 生成的 CREATE TABLE 语句
│       └── README.md                # 字段对照 + 决策说明
└── (待办 阶段 3: client-init.js 等)

.env                                 # 含 DATABASE_URL (Prisma 读取)
.env.example                         # 模板, 含 DATABASE_URL 占位符
```

## 2. 配置要求

`.env` 必须有：
```bash
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/quickmark"
```

**特殊字符编码**（Prisma 5.x 严格 URL 解析）：
| 字符 | URL 编码 |
|------|----------|
| `@`  | `%40` |
| `#`  | `%23` |
| `%`  | `%25` |
| `:`  | `%3A` |
| `/`  | `%2F` |

例：密码 `ayf#pass` 应写为 `ayf%23pass`。

## 3. 日常命令

### 开发期（修改 schema.prisma 后）
```bash
# 1. 改 schema.prisma
# 2. 自动检测变化, 生成新迁移 SQL + 立即应用
npm run prisma:dev
# 等价: prisma migrate dev
# 等价: prisma migrate dev --name <your_change_name>

# 仅生成 SQL 不应用（先审核再跑）
npx prisma migrate dev --create-only --name <change_name>

# 查看当前迁移状态（应用了哪些、漂移检测）
npm run prisma:status
```

### 部署期（生产环境）
```bash
# 仅应用 pending 迁移, 不生成新 SQL
npm run prisma:deploy
# 等价: prisma migrate deploy
```

### 出错时
```bash
# 警告: 会删数据! 仅开发期用
npm run prisma:reset
# 等价: prisma migrate reset (删库重建 + 重跑所有迁移)
```

### 调试工具
```bash
# 图形化数据浏览器 (http://localhost:5555)
npm run prisma:studio

# 格式化 + 校验 schema.prisma
npm run prisma:format
```

## 4. 关键约束

### 4.1 已 baseline 的迁移
`20260625190300_init` **已被标记为已应用**（`prisma migrate resolve --applied`），不再执行。
这是因为 `db/init.js` + `db/migration_v2_hierarchical.sql` 已经把 4 张业务表建好了，Prisma 只是登记历史，未来变更才走 Prisma。

### 4.2 不要手动改已应用的迁移
- 迁移 SQL 在 `migrations/<timestamp>_<name>/migration.sql`
- **已应用的迁移 = 已发布的事实**，改它 = 漂移警告
- 修改方式：新建一个迁移改正（`prisma migrate dev --name fix_xxx`）

### 4.3 字符集必须 utf8mb4
`schema.prisma` 默认 `utf8mb4 COLLATE utf8mb4_unicode_ci`，与 `db/schema.sql` 对齐。**不要在 datasource 块加 `charset` 字段**（Prisma 5.x 警告说不支持）。

### 4.4 relationMode
schema.prisma 第 23 行 `relationMode = "foreignkeys"` — 告诉 Prisma 我们用原生 FK 约束（不是 Prisma 应用层模拟），与 `server.js` 现有 SQL 行为一致。

## 5. 与 db/init.js 的分工

| 工具 | 适用场景 | 是否破坏数据 |
|------|----------|--------------|
| `db/init.js` | 全新环境一次性建表 + 测试数据 | 是（CREATE IF NOT EXISTS 友好） |
| `db/migration_v2_hierarchical.sql` | 一次性手工迁移（v1→v2 多级分类） | 是（已应用，不可重跑） |
| `prisma migrate` | **未来**所有 schema 演进 | 受控（先审 SQL 再跑） |

**应急路径**：无 Prisma 环境（如旧 CI runner），可用 `db/init.js` 重建。但**不能反过来**用 init.js 模拟迁移。

## 6. 阶段 3 预告

阶段 3 将在 `server.js` 引入 Prisma Client：
- 创建 `prisma/client-init.js`（单例 PrismaClient + 健康检查 + 优雅关闭）
- 14 个 API 路由逐个从 `pool.query()` 切换到 `prisma.category.findMany()` 等
- 保留 `pool` 兜底（过渡期双轨运行），全部切换后才删 `mysql2` 依赖

预计工期 3 天，按依赖顺序：
1. 读 API（GET 路由，6 个）
2. 写 API（POST/PUT 路由，5 个）
3. 删除 API（DELETE 路由，3 个）
4. 复杂 SQL（多级分类聚合 + 全文搜索，2 个）→ 阶段 4/5/6 配合

## 7. 常见问题

**Q: `prisma migrate dev` 报 "non-interactive" 错？**
A: 给脚本加 `--create-only`，先用 `prisma migrate diff` 离线生成 SQL，再 `prisma migrate resolve --applied` 登记。

**Q: 改了 schema.prisma 后没生成新迁移？**
A: Prisma 检测到 schema 与数据库一致就不生成。必须改字段才能触发。

**Q: `_prisma_migrations` 表里都是空的？**
A: 因为我们用的是 baseline（--resolve --applied），没跑 SQL 写入。可以看 `migrations/<timestamp>/migration.sql` 文件确认 SQL 内容。

**Q: Prisma 5.x 提示升级到 7.x？**
A: 5→7 是 major 升级，破坏性变更，**不在阶段 2 范围**。如要升级，看 https://pris.ly/d/major-version-upgrade
