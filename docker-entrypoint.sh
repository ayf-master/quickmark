#!/bin/sh
# 初始化数据库（首次运行）
node db/init.js

# 执行 v4 迁移（position 字段）
node -e "
const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'db',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'quickmark'
  });
  try {
    await conn.execute('ALTER TABLE notes ADD COLUMN \`position\` INT NOT NULL DEFAULT 0 AFTER \`is_pinned\`');
    console.log('Migration v4: notes.position added');
  } catch(e) { if (!e.message.includes('Duplicate')) throw e; }
  try {
    await conn.execute('ALTER TABLE categories ADD COLUMN \`position\` INT NOT NULL DEFAULT 0 AFTER \`user_id\`');
    console.log('Migration v4: categories.position added');
  } catch(e) { if (!e.message.includes('Duplicate')) throw e; }
  await conn.end();
}
run().catch(e => console.error('Migration error:', e.message));
"

# 启动服务器
exec node server.js
