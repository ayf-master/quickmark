# Migration `20260625190300_init`

## 目的
为 QuickMark 引入 Prisma Migrate 作为 schema 演进基线。**此迁移不实际修改数据库**，仅登记在 `_prisma_migrations` 表，未来 schema 变更走 Prisma diff 生成 SQL。

## 现状
- 现有 4 张业务表（categories / notes / note_categories / users 占位未建）由 `db/schema.sql` 创建
- 字段名 / 类型 / 约束（含 v2 层级改造的 `parent_id` 自引用 FK、`idx_parent_name` 复合索引）已与 `prisma/schema.prisma` 模型一一对应
- 经验证：`prisma migrate status` 返回 "Database schema is up to date!"

## 字段对照（schema.prisma vs db/schema.sql）

| 表 | Prisma 模型 | SQL 表 | 字段/约束映射 |
|---|---|---|---|
| categories | Category | categories | id / name(VARCHAR 100) / color(VARCHAR 7, #6366f1) / parent_id(FK self) / created_at(3) / updated_at(3) + idx_parent_name(parent_id, name) |
| notes | Note | notes | id / title(VARCHAR 255) / content(TEXT) / is_pinned(bool) / created_at(3) / updated_at(3) |
| note_categories | NoteCategory | note_categories | note_id + category_id 联合主键, idx_category_id, 双 FK CASCADE |
| users | User | (未建) | 阶段 4 鉴权用, 此处预留 |

## 三类 CASCADE 一致性
- categories.parent_id → CASCADE（删父级 → 子级一并删）
- note_categories.note_id → CASCADE（删笔记 → 关联记录一并删）
- note_categories.category_id → CASCADE（删分类 → 关联记录一并删）

## 字符集
所有表 `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`，与 `db/schema.sql` 一致，避免中文 / Emoji 乱码。

## 下一步
- 阶段 2.5：添加 `package.json` 脚本（`migrate:dev` / `migrate:deploy` / `migrate:status`）和文档
- 阶段 2.6：保留 `db/init.js` 作为无 Prisma 环境的应急初始化路径
- 阶段 3：用 Prisma Client 替换 server.js 14 个 API 的手写 SQL
