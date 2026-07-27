-- 用户维度: 连续复习打卡天数 + 最近复习日期
-- 放 User 表而非 settings, 避免被功能开关覆盖时清掉 streak
ALTER TABLE users ADD COLUMN review_streak INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_review_date DATETIME NULL;
