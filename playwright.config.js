import { defineConfig, devices } from '@playwright/test';

// E2E 配置 — 被测对象是 Vite dev server (端口 5173), 所有 API 由各 spec 用 page.route mock,
// 不依赖真实后端/数据库, 因此 CI 里无需起 MySQL。
// 取舍说明: 用 dev server 而非 preview(dist) — 保证跑的就是当前源码, 不会因忘了 build
// 而测到旧产物; 被测行为(DOM 事件/store 逻辑/请求载荷)在 dev/prod 下一致。
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testMatch: /(login|editor|drag-desktop)\.spec\.js/
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: /drag-mobile\.spec\.js/
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    // 首次运行要优化依赖(esbuild), 留足余量; 若 5173 被僵死的旧 dev server 占着,
    // vite(strictPort)会起不来 → 杀掉旧进程或重试即可
    timeout: 120_000
  }
});
