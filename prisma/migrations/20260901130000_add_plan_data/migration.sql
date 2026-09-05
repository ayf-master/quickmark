-- 补齐计划甘特表所需的 plan_data 列
--
-- 背景: prisma/schema.prisma 的 Note 模型声明了 planData Json? @map("plan_data")
--       (甘特图功能, commit 9e45bf6), 但从未生成迁移文件。
--       前端 saveCurrentNote 每次自动保存都会带 planData 字段,
--       未迁移的库在 tx.note.update() 时报:
--       "Unknown argument `planData`" → PUT /api/notes/:id 500 → 保存全部失效
--
-- 幂等: 用 information_schema 判断, 列已存在则跳过

SET @db = DATABASE();

SET @has_plan = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'plan_data');
SET @sql_plan = IF(@has_plan = 0,
  'ALTER TABLE `notes` ADD COLUMN `plan_data` JSON NULL',
  'SELECT 1');
PREPARE stmt FROM @sql_plan;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
