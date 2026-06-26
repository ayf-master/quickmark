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
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});

