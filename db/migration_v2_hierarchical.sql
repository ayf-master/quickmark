-- QuickMark 数据库迁移: 分类层级化
-- 将扁平分类改造为多级(parent_id 自引用模型)
-- 执行: mysql -uroot -p quickmark < db/migration_v2_hierarchical.sql

USE quickmark;

-- 1. 添加 parent_id 字段(默认为 NULL 表示顶级)
ALTER TABLE categories
  ADD COLUMN parent_id INT NULL AFTER name,
  ADD INDEX idx_parent (parent_id),
  ADD CONSTRAINT fk_cat_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id)
    ON DELETE CASCADE;

-- 2. 删除原有的 name 唯一约束,改为允许同层级同名
-- (多级场景下不同父分类下允许同名,如"工作/2024"、"个人/2024")
ALTER TABLE categories DROP INDEX uk_name;
ALTER TABLE categories ADD INDEX idx_parent_name (parent_id, name);

-- 3. 验证: 全部分类均为顶级
SELECT id, name, parent_id FROM categories ORDER BY id;
