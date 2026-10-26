// 清理 vitest 下的嵌套 vite 副本 — 用法: node scripts/clean-dup-vite.js
// 背景: package.json 的 overrides 已强制 vitest/@vitest/mocker 复用顶层 vite,
// 但 npm 对历史遗留的嵌套副本(node_modules/vitest/node_modules/vite, 曾是 vite@8)
// 只警告不删除, 每次 npm install 后都可能残留。双 vite 实例会让 vitest 模块解析混乱,
// 故在测试前统一清掉; 没有残留时静默跳过。
const fs = require('fs');
const path = require('path');

const dup = path.join(__dirname, '..', 'node_modules', 'vitest', 'node_modules', 'vite');

if (!fs.existsSync(dup)) {
  process.exit(0);
}

try {
  fs.rmSync(dup, { recursive: true, force: true, maxRetries: 3 });
  console.log('[clean-dup-vite] 已删除嵌套 vite 副本 (vitest 改用顶层 vite)');
} catch (e) {
  console.error('[clean-dup-vite] 删除失败:', e.code, e.message);
  console.error('[clean-dup-vite] 请先关闭可能占用该目录的进程 (dev server / IDE) 再重试');
  process.exit(1);
}
