-- 为 users 表新增 settings 列, 存储用户偏好 / 功能开关 (JSON)
-- 零迁移原则: 此列随基础结构一并存在, 平时为空; 开启附加功能不触碰表结构。
-- MySQL 5.7+ 支持 JSON 类型; JSON 列不能设非 NULL 字面量默认值, 故用 NULL。
ALTER TABLE `users` ADD COLUMN `settings` JSON NULL;
