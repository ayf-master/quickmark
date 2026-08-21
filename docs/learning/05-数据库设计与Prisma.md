# 05 · 数据库设计与 Prisma

> 数据库是后端的根基。本文带你掌握：SQL/关系型数据库基础、表设计思路、
> Prisma ORM 用法、外键与索引、JSON 字段的妙用（本项目的 planData/settings）。

---

## 1. 关系型数据库核心概念（60 秒入门）

- **表（Table）**：一类数据的集合，如 users 表存所有用户
- **行（Row）**：一条记录，如一个用户
- **列（Column）**：一个字段，如 username
- **主键（Primary Key）**：唯一标识一行，如 id
- **外键（Foreign Key）**：指向另一张表的引用，建立关系
- **索引（Index）**：加速查询的"目录"，查得快但写入稍慢

SQL 增删改查四板斧：

```sql
SELECT * FROM notes WHERE user_id = 1;     -- 查
INSERT INTO notes (title) VALUES ('笔记');  -- 增
UPDATE notes SET title = '新标题' WHERE id = 1;  -- 改
DELETE FROM notes WHERE id = 1;            -- 删
```

---

## 2. 本项目的表设计（每个表都有讲究）

### 2.1 users —— 用户表

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique @db.VarChar(50)
  email        String?  @unique @db.VarChar(255)
  passwordHash String?  @map("password_hash") @db.VarChar(255)
  settings     Json?    @map("settings")   // 功能开关等用户偏好
  role         String   @default("user")   // admin / user
  reviewStreak Int      @default(0)        // 连续复习天数
  ...
}
```

**设计要点（面试可以讲）：**
- `password_hash` 存的是 **bcrypt 哈希**，不是明文——数据库泄露也拿不到密码
- `settings` 是 **JSON 字段**：功能开关等低频变化的结构化数据，不需要单独建表
- `@unique` 唯一约束：用户名/邮箱不能重复（后端显式查重给出友好提示）

### 2.2 notes —— 笔记表

```prisma
model Note {
  id        Int      @id @default(autoincrement())
  title     String   @db.VarChar(255)
  content   String?  @db.Text
  isPinned  Boolean  @default(false)
  mastery   Int?     @default(0)      // 掌握度 0-5（复习系统）
  planData  Json?    @map("plan_data") // 甘特图计划数据！
  userId    Int      @map("user_id")  // 多用户隔离
  @@index([userId])
}
```

**planData 的 JSON 用法（本项目特色）：**
```json
{ "start": "2026-08-01", "end": "2026-08-15", "progress": 60, "color": "#ff6b6b" }
```

为什么用 JSON 而不是拆 4 列？→ 计划功能是后期加的，JSON 可以**无迁移地演化结构**（加个字段不用 ALTER TABLE）。这是"schemaless 演进"的技巧。

### 2.3 categories —— 分类表（多级树）

```prisma
model Category {
  id       Int      @id @default(autoincrement())
  name     String
  parentId Int?     @map("parent_id")   // 自引用外键！
  ...
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: Cascade)
  children Category[] @relation("CategoryTree")
}
```

**多级分类的两种方案（面试考点）：**
1. **邻接表（本项目）**：parent_id 指向父分类。简单直观，但查"全部后代"要递归
2. 物化路径 / 闭包表：查询快，但写入复杂

本项目用 BFS 遍历后代（server.js 的 getDescendantIds），代码简单，分类层级通常不深，够用。

### 2.4 note_categories —— 多对多关联表

```prisma
model NoteCategory {
  noteId     Int @map("note_id")
  categoryId Int @map("category_id")
  note     Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@id([noteId, categoryId])   // 复合主键
}
```

一篇笔记可挂多个分类，一个分类可含多篇笔记 → **多对多**，必须中间表。`@@id([noteId, categoryId])` 保证不会重复关联。

### 2.5 review_cards —— 复习卡表

```prisma
model ReviewCard {
  id         Int      @id @default(autoincrement())
  noteId     Int      @map("note_id")
  userId     Int      @map("user_id")
  dueDate    DateTime @map("due_date")      // 哪天该复习
  interval   Int      @default(0)           // 当前间隔天数
  easeFactor Float    @default(2.5)         // 难度系数
  reps       Int      @default(0)           // 连续答对次数
  @@index([userId, dueDate])   // "今日到期队列"高频查询索引
}
```

**索引设计的面试点**：`@@index([userId, dueDate])` 复合索引——因为最频繁的查询是 `WHERE userId=? AND dueDate<=?`，这个索引让查询直接走索引不用全表扫。

---

## 3. 外键与级联删除（onDelete: Cascade）

```prisma
owner User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

**效果**：用户删账号 → 他所有笔记/分类自动删除，不留孤儿数据。

**面试追问**：为什么不用手动删？→ 数据库层面保证一致性，业务代码永远不可能漏删；MySQL 的 InnoDB 引擎在事务内处理级联，原子且可靠。

---

## 4. Prisma ORM 怎么用（看一段真实代码）

### 4.1 连接与查询

```js
// prisma/dal.js
async function listNotes(userId, query, prisma) {
  return prisma.note.findMany({
    where: { userId, ...(search ? { OR: [{ title: { contains: search } }] } : {}) },
    include: { categories: { include: { category: true } } },  // 联表查询
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }]
  });
}
```

对比原生 SQL 版本（server.js 里保留了）：

```js
const [rows] = await pool.query(`
  SELECT n.*, GROUP_CONCAT(DISTINCT nc.category_id) AS category_ids
  FROM notes n LEFT JOIN note_categories nc ON n.id = nc.note_id
  WHERE n.user_id = ? GROUP BY n.id
`, [userId]);
```

**ORM 优势**：不用手写 JOIN、GROUP_CONCAT 这种复杂 SQL；`where: { userId }` 参数化防注入；错误类型化（P2002 唯一约束冲突）。

### 4.2 多用户数据隔离 —— 项目的核心安全设计

每个查询都带 userId：

```js
// 更新笔记时：where 同时带 id 和 userId，防止越权改别人笔记
await prisma.note.updateMany({
  where: { id: noteId, userId: req.user.id },
  data: { title }
});
```

**面试话术**："所有表都有 user_id，所有查询都带用户条件——数据隔离在数据访问层强制保证，不是靠前端传参。"（IDOR 漏洞防护）

---

## 5. Schema 变更与迁移（migrations）

### 5.1 两种方式

| 方式 | 命令 | 适用场景 |
|------|------|---------|
| `prisma migrate dev` | 生成迁移文件 + 执行 | 本地开发，历史可追溯 |
| `prisma db push` | 直接同步 schema | 快速迭代/生产小改动（本项目容器启动时用这个） |

### 5.2 本项目的演进案例（planData 字段）

```
阶段 8 之前：notes 表没有 plan_data 列
改 schema.prisma 加 planData Json?
    └─▶ prisma db push --accept-data-loss
          └─▶ MySQL 自动 ALTER TABLE notes ADD COLUMN plan_data JSON
                └─▶ 已有数据不受影响（新列默认 NULL）
```

**踩坑经验**：db push 在"删除列"时 MySQL 会拒绝，需要 `--accept-data-loss` 标志（容器入口脚本已加）。

---

## 6. Redis 缓存（用在哪、为什么）

本项目 Redis 有两个用途：

### 6.1 缓存热点数据（分类树）

```js
// server.js 的失效辅助
function invalidateCategoryCache(userId) {
  cache.del('cat_tree:user:' + userId).catch(() => {});
}
```

设计模式：**先写库，再删缓存**（cache-aside）。下次读取时缓存没命中 → 查库 → 重新写缓存。

### 6.2 备用/扩展点

Redis 已接入（ioredis），限流可用 Redis 存储（跨实例共享）。

---

## 7. 中文全文搜索（ngram 详解）

MySQL FULLTEXT 默认按空格分词，中文没有空格——需要 ngram 解析器：

```sql
CREATE FULLTEXT INDEX ft_notes_title_content ON notes (title, content) WITH PARSER ngram
```

**原理**：ngram 按 2 个字符切成词（"快速笔记" → "快速" "速笔" "笔记"），搜索时匹配任意词。

**面试话术**："中文搜索不能用默认分词器，我用了 MySQL 的 ngram 插件，2-gram 切词支持中文全文搜索。缺点是索引体积大、短词误匹配——项目规模下够用，大规模可换 Elasticsearch。"

---

## 8. 自测题

1. 为什么多对多需要中间表？中间表的主键怎么设计？
2. 外键级联删除（Cascade）有什么好处和风险？
3. 为什么 planData 用 JSON 字段而不是拆列？
4. 多用户数据隔离是怎么保证的？（查询带 userId）
5. 复合索引 `[userId, dueDate]` 为什么放在用户表高频查询？
6. ORM 和原生 SQL 各自的优缺点？

下一篇 → [06-认证与安全-JWT](06-认证与安全-JWT.md)
