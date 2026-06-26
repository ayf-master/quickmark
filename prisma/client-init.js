/**
 * Prisma Client 单例
 *
 * 阶段 3 引入, 与 server.js 现有 mysql2 pool **双轨运行**:
 *   - USE_PRISMA=0 (默认): server.js 继续用 pool.query(), 与阶段 1/2 行为一致
 *   - USE_PRISMA=1: server.js 走 prisma.xxx 调方法, pool 仅作事务 / 健康检查兜底
 *
 * 切换策略:
 *   1. 读 API 先切 (GET 路由 6 个), 全 200 + 输出与 pool 完全一致 → 通过
 *   2. 写 API 再切 (POST/PUT/DELETE 8 个), 配 transaction 保证一致性 → 通过
 *   3. 切完关闭 pool, 移除 mysql2 依赖
 *
 * 健康检查: GET /api/health → 调 prisma.$queryRaw`SELECT 1` 验证 DB 可达
 * 优雅关闭: process.on('SIGTERM'/'SIGINT') 调 prisma.$disconnect() 释放连接
 */
const { PrismaClient } = require('@prisma/client');

let instance = null;

function getPrisma() {
  if (instance) return instance;
  instance = new PrismaClient({
    log: process.env.PRISMA_LOG ? ['query', 'warn', 'error'] : ['warn', 'error'],
    // 显式 datasource 覆盖 schema.prisma, 避免 .env 偶发解析不到
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  return instance;
}

// 启动期健康检查: 跑 SELECT 1, 失败则拒绝启动 (fail fast)
async function ping() {
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1 AS ok`;
}

// 优雅关闭: 释放 Prisma Client 内部连接池
async function disconnect() {
  if (instance) {
    await instance.$disconnect();
    instance = null;
  }
}

module.exports = { getPrisma, ping, disconnect };
