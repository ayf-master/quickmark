-- ========================================================================
-- v4-claim-legacy-data.rollback.sql  (BACKWARD)
-- 阶段 5: 精确反向操作 (无需恢复 dump 即可还原)
-- 日期: 2026-06-25
--
-- 还原内容 (从 docs/migrations/backup-2026-06-25-pre-claim.sql 提取的精确值):
--   1. 重新创建 alice 用户 (id 强制 = 2, 包含真实 passwordHash)
--   2. 还原 alice 的 2 分类 (id 13, 14)
--   3. 还原 alice 的 2 笔记 (id 36, 37)
--   4. 还原 admin 下 3 条测试笔记 (id 34, 35, 45)
--
-- 关联表 note_categories 没有被影响的行 (34/35/45/36/37 都没挂分类)
--
-- ⚠️ 注意: 此 rollback 假设 forward 脚本尚未被外部修改覆盖
--   如 forward 后又有新数据写入, 请用 backup dump 还原:
--       mysql -h localhost -u root -p你的数据库密码 < docs/migrations/backup-2026-06-25-pre-claim.sql
-- ========================================================================

START TRANSACTION;

-- 1. 重建 alice 用户 (id 强制 = 2, 保持与删除前一致; 包含真实 passwordHash)
INSERT INTO `users`
  (`id`, `username`, `email`, `password_hash`, `display_name`, `role`, `is_locked`, `created_at`, `updated_at`)
VALUES
  (2, 'alice', NULL,
   '$2b$08$udA2fzysXcNjHLvfC8SnSOip5MoalGlC4bfx.7rmZM28/ObOf.38.',
   'Alice', 'user', 0,
   '2026-06-25 11:44:21.819', '2026-06-25 11:44:21.819');

-- 2. 还原 alice 的 2 分类
INSERT INTO `categories`
  (`id`, `name`, `parent_id`, `user_id`, `color`, `created_at`, `updated_at`)
VALUES
  (13, 'Alice的分类', NULL, 2, '#ff0000', '2026-06-25 11:44:43.000', '2026-06-25 11:44:43.000'),
  (14, '无标题',     NULL, 2, '#00ff00', '2026-06-25 11:45:15.000', '2026-06-25 11:45:15.000');

-- 3. 还原 admin 下的 3 条测试笔记
INSERT INTO `notes`
  (`id`, `title`, `content`, `is_pinned`, `user_id`, `created_at`, `updated_at`)
VALUES
  (34, 'csrf-ok',  'hello', FALSE, 1, '2026-06-25 11:44:05.000', '2026-06-25 11:44:05.000'),
  (35, 'csrf-ok',  'hello', FALSE, 1, '2026-06-25 11:44:10.000', '2026-06-25 11:44:10.000'),
  (45, 'pool-test', 'x',    FALSE, 1, '2026-06-25 19:50:21.000', '2026-06-25 19:50:21.000');

-- 4. 还原 alice 的 2 笔记
INSERT INTO `notes`
  (`id`, `title`, `content`, `is_pinned`, `user_id`, `created_at`, `updated_at`)
VALUES
  (36, 'alice-private', 'alice secret', FALSE, 2, '2026-06-25 11:44:23.000', '2026-06-25 11:44:23.000'),
  (37, 'alice-private', 'alice secret', FALSE, 2, '2026-06-25 11:44:30.000', '2026-06-25 11:44:30.000');

COMMIT;

-- 验证:
--   SELECT COUNT(*) FROM notes;          -- 期望 12
--   SELECT COUNT(*) FROM categories;     -- 期望 11
--   SELECT COUNT(*) FROM users;          -- 期望 2
