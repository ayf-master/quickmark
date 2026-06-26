/**
 * QuickMark 数据库初始化 (应急路径 / 全新环境)
 *
 * 用途:
 *   1. 全新环境无任何表 → 用本脚本一次性建表 + 测试数据
 *   2. 旧 CI runner / 容器无 Prisma CLI → 退回到这个路径
 *
 * 不适用:
 *   - 已建库的环境 (会 CREATE IF NOT EXISTS, 但 v2 迁移需手跑 db/migration_v2_hierarchical.sql)
 *   - schema 演进 (改字段/加索引请用 `npm run prisma:dev` 走 Prisma Migrate)
 *
 * 替代品 (推荐):
 *   - Prisma Migrate (阶段 2+): `npm run prisma:dev` / `npm run prisma:deploy`
 *   - 详见 docs/prisma-migrate-guide.md
 *
 * 启动:
 *   npm run init-db    (会读 .env 拿 DB_* 字段)
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 加载 .env (server.js 不共享进程, 这里要单独再 require 一次)
require('dotenv').config();

// 启动校验: 缺密码时直接退出
if (!process.env.DB_PASSWORD) {
  console.error('\n❌ 缺少环境变量: DB_PASSWORD');
  console.error('   请在 .env 文件中设置, 参考 .env.example\n');
  process.exit(1);
}

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  multipleStatements: true
};

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const conn = await mysql.createConnection(config);
  console.log('已连接到 MySQL，正在初始化数据库...');
  await conn.query(sql);
  console.log('数据库初始化完成！');
  await conn.end();
}

init().catch(err => {
  console.error('初始化失败:', err.message);
  process.exit(1);
});
