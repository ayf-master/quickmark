import { test, expect } from '@playwright/test';
import { blockExternal, mockLogin, mockAppApis } from './helpers';

test.describe('登录', () => {
  test('正确账号密码 → 进入主界面', async ({ page }) => {
    await blockExternal(page);
    await mockLogin(page);
    await mockAppApis(page);

    await page.goto('/');
    await expect(page.locator('#login-username')).toBeVisible();

    await page.fill('#login-username', 'e2e');
    await page.fill('#login-password', 'password123');
    await page.click('button[type="submit"]');

    // 主界面标志: 侧栏分类搜索框 + 笔记列表
    await expect(page.locator('[data-category-search-input]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-id="1"]')).toBeVisible();
  });

  test('错误密码 → 提示错误且停留登录页', async ({ page }) => {
    await blockExternal(page);
    await mockLogin(page, { ok: false });
    await mockAppApis(page);

    await page.goto('/');
    await page.fill('#login-username', 'e2e');
    await page.fill('#login-password', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.getByText('用户名或密码错误')).toBeVisible();
    await expect(page.locator('#login-username')).toBeVisible();
    await expect(page.locator('[data-category-search-input]')).toHaveCount(0);
  });
});
