#!/bin/sh
# QuickMark 容器启动入口
#
# 建表策略: 以 Prisma schema 为唯一来源, 用 `db push` 幂等对账
#   - 不再使用 `migrate deploy`: 项目早期 legacy 迁移链存在重复建表冲突, 在空库也会失败
#   - `db push` 直接把 schema.prisma 同步进库, 兼容老库(不依赖迁移历史), 不删已有数据
#   - FULLTEXT ngram 索引 Prisma 无法表达, 单独用 mysql2 幂等补齐 (搜索功能依赖)
set -e

echo "[entrypoint] 同步数据库结构 (db push)..."
# --skip-generate: 镜像构建时 postinstall 已生成 client 并打包进镜像, 入口无需再生成(容器内生成慢/可能触发引擎下载)
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] 确保 FULLTEXT ngram 索引存在 (中文搜索用)..."
node -e "
const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'db',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'quickmark'
  });
  const [rows] = await conn.execute(
    'SELECT COUNT(*) AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [process.env.DB_NAME || 'quickmark', 'notes', 'ft_notes_title_content']
  );
  if (rows[0].c === 0) {
    await conn.execute('CREATE FULLTEXT INDEX ft_notes_title_content ON notes (title, content) WITH PARSER ngram');
    console.log('[entrypoint] 已创建 FULLTEXT ngram 索引');
  } else {
    console.log('[entrypoint] FULLTEXT 索引已存在, 跳过');
  }
  await conn.end();
})().catch(e => { console.error('[entrypoint] FULLTEXT 索引处理失败:', e.message); process.exit(1); });
"

echo "[entrypoint] 启动服务..."
exec node server.js
