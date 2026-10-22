import { test, expect } from '@playwright/test';
import { blockExternal, mockAppApis, TEST_USER, settleAnimations, expectReorder } from './helpers';

// 桌面端 HTML5 拖拽排序 — 历史上回归最多的功能(前后修了 5 轮)
// 断言两层: 拖拽过程中目标卡片出现 note-drop-here 高亮; 松手后 PATCH reorder 载荷正确
test.describe('桌面端拖拽排序', () => {
  test('拖第 1 篇到第 3 篇上 → 高亮出现 + ids 变为 [2,3,1,4,5]', async ({ page }) => {
    await blockExternal(page);
    const captured = await mockAppApis(page, { me: TEST_USER });

    await page.goto('/');
    await settleAnimations(page);

    const source = page.locator('[data-id="1"]');
    const target = page.locator('[data-id="3"]');
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();

    const sb = await source.boundingBox();
    const tb = await target.boundingBox();

    // HTML5 DnD: mouse down + move 触发 dragstart/dragover, Chromium 下可断言中间态
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 12 });

    // 拖到目标上: 目标高亮 + 被拖项进入拖拽态
    await expect(target).toHaveClass(/note-drop-here/);
    await expect(source).toHaveClass(/note-dragging/);

    await page.mouse.up();

    // 松手: PATCH /api/notes/reorder 载荷 = 移动后的完整顺序
    await expectReorder(page, captured, [2, 3, 1, 4, 5]);

    // DOM 顺序同步: 第一张变成 id=2
    await expect(page.locator('[data-id]').first()).toHaveAttribute('data-id', '2');
  });

  test('拖到紧邻的下一位也能换序(不变成 no-op)', async ({ page }) => {
    await blockExternal(page);
    const captured = await mockAppApis(page, { me: TEST_USER });

    await page.goto('/');
    await settleAnimations(page);

    const source = page.locator('[data-id="2"]');
    const target = page.locator('[data-id="3"]');
    const sb = await source.boundingBox();
    const tb = await target.boundingBox();

    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 12 });
    await expect(target).toHaveClass(/note-drop-here/);
    await page.mouse.up();

    // 插到 toIdx 位置: [1,3,2,4,5]
    await expectReorder(page, captured, [1, 3, 2, 4, 5]);
  });
});
