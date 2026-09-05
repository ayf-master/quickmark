-- 间隔重复学习系统: ReviewCard 表 + Note.mastery 字段
-- 对应 prisma/schema.prisma 新增的 ReviewCard 模型与 Note.mastery
--
-- 修复说明 (2026-09-01):
--   1) `interval` 是 MySQL 8.0 保留字, 裸写会让 CREATE TABLE 报 1064 语法错误
--      → 必须用反引号包裹
--   2) 改为幂等: 用 information_schema 判断列/表是否存在后再建
--      原版非幂等, 一旦部分执行 (mastery 已加但建表失败) 就无法重跑,
--      Prisma 会卡在 P3018 "New migrations cannot be applied before the error is recovered from"
--
-- 1) Note 加掌握度字段 (默认 0, 不影响现有笔记)

SET @db = DATABASE();

SET @has_mastery = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'mastery');
SET @sql_mastery = IF(@has_mastery = 0,
  'ALTER TABLE `notes` ADD COLUMN `mastery` INT NULL DEFAULT 0 AFTER `position`',
  'SELECT 1');
PREPARE stmt FROM @sql_mastery;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 复习卡表 (interval 为保留字, 必须反引号)
CREATE TABLE IF NOT EXISTS `review_cards` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `note_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `due_date` DATETIME(3) NOT NULL,
  `interval` INT NOT NULL DEFAULT 0,
  `ease_factor` DOUBLE NOT NULL DEFAULT 2.5,
  `reps` INT NOT NULL DEFAULT 0,
  `last_reviewed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_user_due` (`user_id`, `due_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 外键: 单独加, 用 information_schema 判重以保幂等
SET @has_fk_note = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'review_cards' AND CONSTRAINT_NAME = 'review_cards_note_id_fkey');
SET @sql_fk_note = IF(@has_fk_note = 0,
  'ALTER TABLE `review_cards` ADD CONSTRAINT `review_cards_note_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql_fk_note;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk_user = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'review_cards' AND CONSTRAINT_NAME = 'review_cards_user_id_fkey');
SET @sql_fk_user = IF(@has_fk_user = 0,
  'ALTER TABLE `review_cards` ADD CONSTRAINT `review_cards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql_fk_user;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
