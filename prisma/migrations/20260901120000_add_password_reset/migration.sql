-- 补齐找回密码所需的两列
--
-- 背景: prisma/schema.prisma 的 User 模型声明了
--         passwordResetToken   @map("password_reset_token")
--         passwordResetExpires @map("password_reset_expires")
--       但此前只改了 schema, 从未生成迁移文件。
--       结果: 未迁移到位的库在 prisma.user.findUnique() 时报错
--       "The column `quickmark.users.password_reset_token` does not exist"
--       (Prisma 默认 SELECT 全部 scalar 列, 缺任意一列就会炸)
--
-- 幂等: 用 information_schema 判断, 列已存在则跳过, 兼容手工建过列的库

SET @db = DATABASE();

SET @has_tok = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_token');
SET @sql_tok = IF(@has_tok = 0,
  'ALTER TABLE `users` ADD COLUMN `password_reset_token` VARCHAR(255) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql_tok;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_exp = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_expires');
SET @sql_exp = IF(@has_exp = 0,
  'ALTER TABLE `users` ADD COLUMN `password_reset_expires` DATETIME(3) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql_exp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
