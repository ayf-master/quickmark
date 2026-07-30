-- 补齐 Prisma 迁移链中缺失的两块 (由原 legacy db/*.sql / v4 ALTER 添加, 但从未生成迁移):
--   1) notes.position / categories.position  (add_review_card 迁移依赖 position 已存在)
--   2) feedback 表
-- 全部幂等: 已存在则跳过, 兼容 legacy SQL 建出的旧库。
-- 放在 fulltext_ngram 之后、add_review_card 之前 (按时间戳排序)。

SET @db = DATABASE();

-- notes.position
SET @has_pos_notes = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'position');
SET @sql_pos_notes = IF(@has_pos_notes = 0, 'ALTER TABLE `notes` ADD COLUMN `position` INT NOT NULL DEFAULT 0 AFTER `is_pinned`', 'SELECT 1');
PREPARE stmt FROM @sql_pos_notes;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- categories.position
SET @has_pos_cat = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'position');
SET @sql_pos_cat = IF(@has_pos_cat = 0, 'ALTER TABLE `categories` ADD COLUMN `position` INT NOT NULL DEFAULT 0 AFTER `user_id`', 'SELECT 1');
PREPARE stmt FROM @sql_pos_cat;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- feedback 表
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `content` TEXT NOT NULL,
  `contact` VARCHAR(200) NULL,
  `user_id` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `feedback_user_id_idx`(`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
