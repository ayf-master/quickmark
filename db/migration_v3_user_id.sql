-- =============================================================================
-- QuickMark v3 迁移: 加 User 表 + notes/categories 加 user_id 外键
-- 阶段 4 鉴权启用, 多用户隔离
-- 适用: 已存在 v2 schema (categories.parent_id + notes 基础字段) 的库
-- =============================================================================
--
-- 启动顺序 (重要, 因外键依赖):
--   1. 建 users 表
--   2. 插入默认 admin 账号 (id=1), 把现有数据全部归属他
--   3. ALTER TABLE categories / notes 加 user_id 列 (允许 NULL 临时态)
--   4. UPDATE 回填 user_id=1
--   5. ALTER 改 user_id 为 NOT NULL + 加 FK CASCADE + 加索引
--
-- 与 Prisma 关系:
--   - 本文件是 db/migration_v2_hierarchical.sql 的姊妹文件, 应急路径
--   - 阶段 4 之后 schema 演进统一走 `npm run prisma:dev`
--   - 此文件留作"无 Prisma 环境的应急 SQL" (如旧 CI runner / 手动维护)
-- =============================================================================

-- 1. 建 users 表 (若已存在, IF NOT EXISTS 跳过)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NULL,
    `password_hash` VARCHAR(255) NULL,
    `display_name` VARCHAR(100) NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'user',
    `is_locked` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 插入默认 admin 账号 (id=1)
--    临时密码: "password" (bcrypt 8 轮哈希, 阶段 4.5 注册接口会重新生成 12 轮覆盖)
--    ⚠️ 首次部署后必须立即改密码 (8 轮 ≈ 30ms, 仅用于 CI / 自动化测试, 生产用 12 轮)
--    哈希: $2b$08$vcLLycRyvMf93NOeuTYFhOzpD7OOCYKyV7VXFGFvhBQbTptXStiXu = "password"
INSERT INTO `users` (`id`, `username`, `password_hash`, `display_name`, `role`, `is_locked`, `created_at`, `updated_at`)
VALUES (
    1, 'admin',
    '$2b$08$vcLLycRyvMf93NOeuTYFhOzpD7OOCYKyV7VXFGFvhBQbTptXStiXu',
    '系统管理员',
    'admin',
    FALSE,
    NOW(3),
    NOW(3)
);
-- INSERT ... ON DUPLICATE KEY UPDATE 幂等, 但 password_hash 不会重写
-- 首次部署 / 密码遗失时, 注释下面 INSERT, 手跑:
--   UPDATE users SET password_hash = (新哈希), updated_at = NOW(3) WHERE username = 'admin'
-- 重新生成 12 轮哈希 (生产级): bcrypt.hashSync('YOUR_NEW_PASSWORD', 12)

-- 3. ALTER TABLE categories: 加 user_id (允许 NULL 临时态)
ALTER TABLE `categories`
    ADD COLUMN `user_id` INT NULL AFTER `parent_id`;

-- 4. ALTER TABLE notes: 加 user_id (允许 NULL 临时态)
ALTER TABLE `notes`
    ADD COLUMN `user_id` INT NULL AFTER `is_pinned`;

-- 5. UPDATE 回填 user_id=1 (所有现有数据归 admin)
UPDATE `categories` SET `user_id` = 1 WHERE `user_id` IS NULL;
UPDATE `notes`     SET `user_id` = 1 WHERE `user_id` IS NULL;

-- 6. ALTER: user_id 改 NOT NULL + 加 FK CASCADE + 加索引
ALTER TABLE `categories`
    MODIFY COLUMN `user_id` INT NOT NULL,
    ADD INDEX `idx_user_id`(`user_id`),
    ADD CONSTRAINT `categories_user_id_fkey`
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `notes`
    MODIFY COLUMN `user_id` INT NOT NULL,
    ADD INDEX `idx_user_id`(`user_id`),
    ADD CONSTRAINT `notes_user_id_fkey`
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- 验收查询
-- =============================================================================
-- SELECT
--   (SELECT COUNT(*) FROM users WHERE id = 1) AS admin_exists,
--   (SELECT COUNT(*) FROM categories WHERE user_id = 1) AS cats_belonged,
--   (SELECT COUNT(*) FROM notes WHERE user_id = 1) AS notes_belonged;
-- 期望: 1, 9, 6 (与阶段 1-2 一致)
