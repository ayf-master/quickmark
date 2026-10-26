import { test, expect } from '@playwright/test';
import { blockExternal, mockAppApis, TEST_USER, settleAnimations } from './helpers';

test.describe('编辑器自动保存', () => {
  test('改标题 → 防抖后 PUT /api/notes/:id 带上新标题', async ({ page }) => {
    await blockExternal(page);
    const captured = await mockAppApis(page, { me: TEST_USER });

    await page.goto('/');
    await settleAnimations(page);

    // 打开第一篇笔记
    await page.locator('[data-id="1"]').click();
    const titleInput = page.locator('input[aria-label="笔记标题"]');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('第一篇笔记');

    // 改标题 (store 里 watch(editTitle) → scheduleAutoSave 防抖 → PUT)
    await titleInput.fill('E2E 改过的标题');

    await expect.poll(() => captured.updates.length, { timeout: 8000 }).toBeGreaterThan(0);
    expect(captured.updates[0]).toMatchObject({ title: 'E2E 改过的标题' });
  });
});
