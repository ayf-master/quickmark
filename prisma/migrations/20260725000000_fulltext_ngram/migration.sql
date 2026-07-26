-- 为中文笔记搜索建立 FULLTEXT 索引 (ngram 解析器支持中日韩分词)
-- 搜索逻辑见 prisma/dal.js 的 searchNoteIds: MATCH(title, content) AGAINST(... IN BOOLEAN MODE)
-- 要求 MySQL 5.7.6+ / 8.x InnoDB; ngram 解析器为内置, 无需额外安装
CREATE FULLTEXT INDEX `ft_notes_title_content` ON `notes` (`title`, `content`) WITH PARSER ngram;
