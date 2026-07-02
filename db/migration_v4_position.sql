-- QuickMark v4: 添加 position 排序字段
-- 笔记和分类都支持自定义排序位置

ALTER TABLE notes ADD COLUMN `position` INT NOT NULL DEFAULT 0 AFTER `is_pinned`;
ALTER TABLE categories ADD COLUMN `position` INT NOT NULL DEFAULT 0 AFTER `user_id`;

-- 初始按照当前排序规则填充 position 值
SET @row_num = 0;
UPDATE notes SET `position` = (@row_num := @row_num + 1) ORDER BY `is_pinned` DESC, `updated_at` DESC;

SET @row_num = 0;
UPDATE categories SET `position` = (@row_num := @row_num + 1) ORDER BY `name` ASC;
