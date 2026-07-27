-- 间隔重复学习系统: ReviewCard 表 + Note.mastery 字段
-- 对应 prisma/schema.prisma 新增的 ReviewCard 模型与 Note.mastery

-- 1) Note 加掌握度字段 (默认 0, 不影响现有笔记)
ALTER TABLE notes ADD COLUMN mastery INT NULL DEFAULT 0 AFTER position;

-- 2) 复习卡表
CREATE TABLE review_cards (
  id BIGINT NOT NULL AUTO_INCREMENT,
  note_id INT NOT NULL,
  user_id INT NOT NULL,
  due_date DATETIME(3) NOT NULL,
  interval INT NOT NULL DEFAULT 0,
  ease_factor DOUBLE NOT NULL DEFAULT 2.5,
  reps INT NOT NULL DEFAULT 0,
  last_reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_user_due (user_id, due_date),
  CONSTRAINT fk_reviewcard_note FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviewcard_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
