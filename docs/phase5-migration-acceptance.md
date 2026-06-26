# 阶段 5 验收报告 — 旧数据迁移 (v4-claim-legacy-data)

**日期**: 2026-06-25
**执行人**: WorkBuddy
**决策**: 用户拍板 A/B/C/D 全套方案（迁移源 v2/归属 admin/清测试残留/可回滚）

## 1. 迁移前数据画像

| 用户 | id | 笔记 | 分类 | 来源 |
|---|---|---|---|---|
| admin | 1 | 10 | 9 | 阶段 3 复制 v1 + 阶段 4 集成测试 3 条 |
| alice | 2 | 2 | 2 | 阶段 4 集成测试 |

admin 下 10 笔记中：
- **真·用户数据** (7 条): id 10/11/16/17/20/22/29 (新笔记/RLHF/定律/个人疑问/updated)
- **集成测试残留** (3 条): id 34/35 (csrf-ok) + id 45 (pool-test)

alice 全部是测试数据 (2 笔记 alice-private + 2 分类 Alice的分类/无标题)。

## 2. 迁移方案

### 保留
- admin 的 7 条真·用户笔记 + 9 分类（不动）
- note_categories 5 条关联 (admin 真·笔记挂分类)

### 删除
- 笔记 id 34, 35, 45 (admin 下 3 条测试笔记)
- 用户 alice (id=2)，FK Cascade 自动清：2 笔记 + 2 分类

### 净变化
- notes: 12 → 7 (-5)
- categories: 11 → 9 (-2)
- users: 2 → 1 (-1)
- note_categories: 5 → 5 (无变化)

## 3. 产出物

| 文件 | 用途 | 大小 |
|---|---|---|
| `docs/migrations/v4-claim-legacy-data.md` | 迁移方案文档 | 1.7 KB |
| `docs/migrations/v4-claim-legacy-data.sql` | Forward SQL | 1.1 KB |
| `docs/migrations/v4-claim-legacy-data.rollback.sql` | Backward SQL (含真实 hash) | 1.9 KB |
| `docs/migrations/backup-2026-06-25-pre-claim.sql` | 迁移前全库 dump (完整备份) | 12.3 KB |

## 4. 验收结果

### 4.1 Baseline 验证（迁移前）
```
users: [admin, alice]
noteCount: 12, catCount: 11, ncCount: 5
adminNotes: 10, adminCats: 9
aliceExists: true
testNoteIdsFound: [34, 35, 45, 36, 37]
```

### 4.2 Forward 验证（迁移后）
```
✅ mysql 导入 exit=0
✅ verify script exit=0
users: [admin]
noteCount: 7, catCount: 9, ncCount: 5
adminNotes: 7, adminCats: 9
aliceExists: false
testNoteIdsFound: []
```

### 4.3 端到端 API 验证（admin 登录后）
```
=== 1. Login === {"user":{"id":1,"username":"admin","displayName":"系统管理员","role":"admin"}}
=== 2. notes === count=7 titles=新笔记|新笔记|RLHF|定律|新笔记|个人疑问|updated
=== 3. categories === count=9 names=AI知识|个人|学习|灵感|零散知识|LLM|Python|AI|定律
=== 4. me === {"user":{"id":1,"username":"admin","role":"admin"}}
```

### 4.4 Rollback 验证（逆向操作）
```
✅ rollback SQL 导入 exit=0
✅ verify script: 恢复 12 notes / 11 cats / alice 在 / 5 测试笔记全在
```

### 4.5 Re-Forward 验证（最终态）
```
✅ 再次执行 forward, 状态回到 7/9/1/admin only / 无测试笔记
```

## 5. 注意事项

### 5.1 admin 默认密码
- 来自 `db/migration_v3_user_id.sql` 的临时密码 = `password` (bcrypt 8 轮)
- **生产部署前必须改** (用 12 轮重哈希):
  ```bash
  node -e "console.log(require('bcryptjs').hashSync('NEW_PASSWORD', 12))"
  mysql -h localhost -u root -p123456 quickmark \
    -e "UPDATE users SET password_hash='<新hash>', updated_at=NOW(3) WHERE username='admin'"
  ```

### 5.2 POOL_FALLBACK_USER_ID 标记
- server.js 里有 `POOL_FALLBACK_USER_ID = 1` 注释
- 阶段 5 决策: **保留 pool 模式应急路径**, 不删
- 但生产环境应只跑 `USE_PRISMA=1`

### 5.3 集成测试清理
- 当前阶段 4 集成测试用 `userId=1` 共享 admin 数据
- 阶段 5 决策: **不修测试**, 但未来应在测试 setup 时创建临时 user + 测试后清理
- (留到阶段 6/7 再做)

## 6. 不在范围

- 阶段 6: Redis 缓存 (列表/分类读多写少场景)
- 阶段 7: 前端登录 UI + API 拦截器
- 集成测试 cleanup 增强

## 7. 数据安全 checklist

- [x] 迁移前 mysqldump 留底（`backup-2026-06-25-pre-claim.sql`）
- [x] 迁移有 forward + rollback 双向 SQL
- [x] rollback 包含 alice 真实 passwordHash，可立即登录
- [x] verify 脚本覆盖：用户数 / 笔记数 / 分类数 / 测试笔记 id 列表
- [x] 端到端 API 验证（admin 登录能拿数据）
- [x] 进程停掉执行（避免 dump 时写入冲突）
