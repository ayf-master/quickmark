# 阶段 5: 旧数据迁移 (v4-claim-legacy-data)

## 背景

- 阶段 3 把 v1 库完整复制到 `quickmark` 库(库名沿用, 不带 _v2 后缀)
- 阶段 4 加鉴权时引入了 user_id NOT NULL 约束 (v3 迁移)
- 阶段 4 集成测试创建了 alice (id=2) 用户和测试数据
- 所有"老数据"已被阶段 3 复制时挂到了 `user_id=1` (即 admin)
- admin 用户的部分笔记是阶段 4 集成测试新增的 (csrf-ok / pool-test)

## 目标

1. **保留**: admin 用户的真·用户数据 (RLHF/定律/个人疑问等)
2. **删除**: alice 用户 (连带她 2 笔记 + 2 分类) + admin 下 3 条测试笔记 (csrf-ok×2, pool-test)
3. **记录**: 全过程可回滚, 留 audit trail

## 迁移源/目标

| 类型 | 源 | 目标 | 数量 |
|---|---|---|---|
| 用户 (admin) | id=1, user_id=1 数据 | 保留不动 | 7 笔记 + 9 分类 |
| 用户 (alice) | id=2 | DELETE (Cascade 清 2 笔记 + 2 分类) | -2 笔记 -2 分类 |
| 测试笔记 | id=34, 35, 45 | DELETE 精确删除 | -3 笔记 |
| 净变化 | | | -5 笔记, -2 分类, -1 用户 |

## 前置条件

```bash
# 1. 确认库连接
node -e "const p=require('@prisma/client'); const c=new p.PrismaClient(); c.user.findMany().then(u=>{console.log(u);c.\$disconnect()})"

# 2. 确认服务停止 (避免 dump 时写入)
# 任务管理器或 taskkill /PID <pid> /F
```

## 执行步骤

### Step 1: 备份

```bash
cd D:\vibeCoding\quickmark
mysqldump -h localhost -u root -p你的数据库密码 --single-transaction --routines --triggers \
  --databases quickmark \
  > docs/migrations/backup-2026-06-25-pre-claim.sql
```

### Step 2: 执行 forward 迁移

```bash
mysql -h localhost -u root -p你的数据库密码 quickmark < docs/migrations/v4-claim-legacy-data.sql
```

### Step 3: 验证

```bash
node prisma/_probes/verify-after-claim.js
# 期望: admin notes=7, categories=9, alice 已删
```

### Step 4: 回归

启动 server, 用 admin 登录, curl 测试 7 笔记 / 9 分类全可见。

## 回滚

如发现迁移有误, 一行命令还原:

```bash
mysql -h localhost -u root -p你的数据库密码 < docs/migrations/backup-2026-06-25-pre-claim.sql
```

**或**精确反向操作 (不还原 dump 但只撤数据删除):

```bash
mysql -h localhost -u root -p你的数据库密码 quickmark < docs/migrations/v4-claim-legacy-data.rollback.sql
```

## 不在范围

- 不动 admin 的笔记/分类 (已是真·用户数据)
- 不创建任何"imported"专用账户 (决策: 全部归 admin)
- 不连接外部 v1 库 (决策: 源就是 v2 库里的现有数据)
- 不动 v1→v2 复制脚本 `db/init.js` (保留应急路径)

## 后续

- 阶段 6: Redis 缓存 (列表/分类读多写少场景)
- 集成测试 cleanup 增强: 测试完成后自动清掉自己产生的数据 (避免下次再手动删)
