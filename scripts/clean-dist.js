// 构建前清空 dist/ — 用法: node scripts/clean-dist.js
// 背景: vite.config 里 emptyOutDir:false (避开 Vite 自带清理在某些环境被拦截),
// 但没有清理步骤会导致旧 chunk 在 dist 里堆积; 且 publicDir 拷贝走 copyFileSync,
// 目标已存在时直接覆盖 —— 这里显式先清空, 让 vite 的所有写入都是新文件。
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(dist)) {
  console.log('[clean-dist] dist 不存在, 跳过');
  process.exit(0);
}

try {
  fs.rmSync(dist, { recursive: true, force: true, maxRetries: 3 });
  console.log('[clean-dist] 已清空 dist/');
} catch (e) {
  console.error('[clean-dist] 清理失败:', e.code, e.message);
  console.error('[clean-dist] 如文件被占用(dev server / 编辑器), 请先关闭再构建');
  process.exit(1);
}
