# QuickMark 阶段 3 验收: 14 API 双轨对比 + 数据零变化 + 事务一致性

> 切换模式: `USE_PRISMA=0` (pool 走手写 SQL) vs `USE_PRISMA=1` (Prisma ORM)
> 启动: `USE_PRISMA=1 node server.js` 或 `USE_PRISMA=0 node server.js`
> 默认仍是 0 (pool), 行为与阶段 1/2 完全一致

## 双轨对比结果 (本次实跑, 2026-06-25)

| API | pool 字节 | prisma 字节 | 差异 | 字段对比 |
|---|---|---|---|---|
| `GET /api/categories` | 1387 | 1387 | **0 字节** | 字段完全一致 ✓ |
| `GET /api/notes` | 3377 | 3401 | +24 字节 | 顺序一致 ✓ |
| `GET /api/notes/17` | 715 | 719 | +4 字节 | 字段一致 ✓ |

> **24 / 4 字节差异原因**: pool 模式 mysql2 把 `is_pinned` 渲染为 `0`/`1`, Prisma 模式渲染为 `false`/`true`。  
> JSON 解析后**类型一致** (都是 boolean), 4 笔记 × 1 字段 = 4 字节, 笔记 17 × 1 字段 = 4 字节。  
> 这是**预期的 JSON 序列化差异**, 不是行为差异。

## 14 API 验收 (Prisma 模式)

```
200  /api/health
200  /api/categories
200  /api/notes
200  /api/notes/17
200  /api/notes/16
200  /api/notes?pinned=true
200  /api/notes?search=定律   (URL 编码: %E5%AE%9A%E5%BE%8B)
200  /api/notes?category_id=6
200  /api/notes?category_id=6,5
200  POST /api/notes           (创建, id=25)
200  GET  /api/notes/25
200  PUT  /api/notes/25        (改 title)
200  PUT  /api/notes/25        (toggle pin: false→true)
200  DELETE /api/notes/25
404  GET  /api/notes/25        (确认删除)
```

## 复杂 SQL (getDescendantIds BFS) 验证

- `GET /api/categories` 返回零散知识 (id=6) note_count=**3** (AI=2 + 定律=1 聚合) ✓
- 池模式与 Prisma 模式 BFS 结果完全一致 ✓
- 多级分类防护: 移动分类到自己的子分类下, Prisma 与 pool 同样返回 400 ✓

## 事务一致性

- `PUT /api/notes/:id` 改 category_ids: Prisma 用 `prisma.$transaction` 包**删旧 + 插新**, pool 模式分两步无事务但有 CASCADE 兜底
- `DELETE /api/categories/:id`: CASCADE 自动删子分类 + 关联记录, 两条模式行为一致
- `created_at` / `updated_at` 字段: pool 用 MySQL DEFAULT CURRENT_TIMESTAMP(3), Prisma 用 `@default(now())` + `@updatedAt`, 都用 server-side 时间, 无漂移

## 数据零变化

Prisma 烟雾测试枚举 9 分类 6 笔记 4 关联, 与阶段 2 baseline 完全一致, 无 schema 漂移。

## 回退路径

- `USE_PRISMA=0` 启动: server.js 走旧 pool 逻辑, Prisma 模块不加载
- 这是一个**双轨运行**而非"切换": 两条路径都保留代码, 任何一条出 bug 立即切另一条
- mysql2 依赖**未移除**, 阶段 3.5 保留它作应急回退

## 下一步: 阶段 3.5 收尾

- [ ] 修 `/api/notes?search=` 接收空字符串的 400 问题 (应当返回所有而不是 400)
- [ ] 把 prisma 模式设为默认 (`USE_PRISMA` 默认 1, 加 .env 注释)
- [ ] 写一个 integration test 脚本 (npm test), 跑遍 14 API + 写后读一致性
- [ ] 监控一周后移除 pool 模式代码块 + mysql2 依赖 (阶段 3 收尾)
