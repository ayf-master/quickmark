import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// Vite 配置:
// 1. publicDir 默认 'public/': Vite dev 直接服务 public/ 里所有静态资源
//    - public/index.html 已被删除 (改用项目根 index.html)
//    - public/css/ 已被复制到项目根 css/ (避免 Vite 缓存冲突)
//    - public/js/comps/*.js 保留 (历史快照, 不再被加载, 但保留以备回滚)
//    - public/vendor/tailwindcss.js 由 Vite 直接服务
// 2. 后端 (server.js) 仍用 express.static('public') 服务, 用于生产部署兼容
//    - dev 阶段用户访问 5173 走 Vite, 不打 3000, 所以后端 public/ 不被访问
// 3. 开发期代理 /api 和 /uploads 到后端 3000
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/css': fileURLToPath(new URL('./css', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    // 门禁只收 vitest 单测; 以下两个是纯 Node 脚本(无 describe/it), 由各自 npm script 跑:
    //   test/sm2.test.js      -> npm run test:sm2   (assert 风格算法校验)
    //   test/integration.js   -> npm run test:pool / test:prisma (需真起服务+数据库)
    include: ['src/**/*.test.js', 'test/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**', 'test/integration.js', 'test/sm2.test.js'],
    // 固定 vmForks 池: 默认 forks 池依赖子进程 RPC 传输, 在部分环境(如沙箱/CI)会被阻断,
    // 报 "Cannot read properties of undefined (reading 'config')" 的假错; vm 池走 vm.SourceTextModule,
    // 行为一致且跨环境稳定, 单测场景无功能差异
    pool: 'vmForks'
  },
  build: {
    outDir: 'dist',
    // 空 dist 操作改由 npm script 自己处理 (rm -rf), 避免 Windows 平台
    // Vite 自带的 safe-delete trash 操作被沙箱拦截导致构建卡住
    emptyOutDir: false
  }
});

