-- ========================================================================
-- v4-claim-legacy-data.sql  (FORWARD)
-- 阶段 5: 清理集成测试残留数据
-- 日期: 2026-06-25
--
-- 删除内容:
--   1. 测试笔记 id 34 (csrf-ok)     — 阶段 4 集成测试产生
--   2. 测试笔记 id 35 (csrf-ok)     — 阶段 4 集成测试产生
--   3. 测试笔记 id 45 (pool-test)   — 阶段 4 集成测试产生
--   4. 用户 alice (id=2)             — 阶段 4 集成测试用户
--      Cascade 自动清: 2 笔记 (36,37) + 2 分类 (13,14) + note_categories 关联
--
-- 保留:
--   - admin (id=1) 真·用户数据 7 笔记 + 9 分类 (不动)
--
-- 净变化: notes -5, categories -2, users -1
--
-- ⚠️ 执行前请先 mysqldump 留底:
--   mysqldump -h localhost -u root -payf147852369 --single-transaction \
--     --databases quickmark > docs/migrations/backup-2026-06-25-pre-claim.sql
-- ========================================================================

START TRANSACTION;

-- 1. 删除 admin 下的 3 条测试笔记 (FK Cascade 会清 note_categories 关联)
DELETE FROM `notes` WHERE `id` IN (34, 35, 45);

-- 2. 删除 alice 用户 (FK Cascade 清她的 2 笔记 + 2 分类 + note_categories 关联)
DELETE FROM `users` WHERE `id` = 2;

COMMIT;

-- 验证 (执行后用 SELECT 看结果):
--   SELECT COUNT(*) FROM notes;          -- 期望 7
--   SELECT COUNT(*) FROM categories;     -- 期望 9
--   SELECT COUNT(*) FROM users;          -- 期望 1
--   SELECT id, title FROM notes ORDER BY id;  -- 应该看不到 34/35/45/36/37
--   SELECT id, username FROM users;      -- 应该只有 admin
