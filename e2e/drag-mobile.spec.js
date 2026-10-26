import { test, expect } from '@playwright/test';
import { blockExternal, mockAppApis, TEST_USER, settleAnimations, dispatchTouch, expectReorder } from './helpers';

// 手机端长按拖拽排序 — 自定义 touchstart 计时器(350ms) + 6px 容差, 历史上修了 5 轮的功能
// 合成触摸序列: 按下(基本不动) → 等长按计时器触发 → 移动到目标 → 松手
// 断言两层: 拖拽中目标卡片 note-drop-here 高亮; 松手后 PATCH reorder 载荷正确
test.describe('手机端长按拖拽排序', () => {
  test('长按第 1 篇拖到第 3 篇 → 高亮出现 + ids 变为 [2,3,1,4,5]', async ({ page }) => {
    await blockExternal(page);
    const captured = await mockAppApis(page, { me: TEST_USER });

    await page.goto('/');
    await settleAnimations(page);

    const source = page.locator('[data-id="1"]');
    const target = page.locator('[data-id="3"]');
    await expect(source).toBeVisible();

    const sb = await source.boundingBox();
    const tb = await target.boundingBox();
    const startY = sb.y + sb.height / 2;
    const targetY = tb.y + tb.height / 2;

    // 1. 手指按下, 保持基本不动(抖动 < 6px 容差, 不取消长按计时器)
    await dispatchTouch(page, '[data-id="1"]', 'touchstart', startY);

    // 2. 等 350ms 长按计时器触发(多等一点余量)
    await page.waitForTimeout(450);

    // 3. 移动到目标卡片中心 → 命中判定用被拖卡片视觉中心
    await dispatchTouch(page, '[data-id="1"]', 'touchmove', targetY);
    await expect(target).toHaveClass(/note-drop-here/);

    // 4. 松手 → reorder
    await dispatchTouch(page, '[data-id="1"]', 'touchend', targetY);
    await expectReorder(page, captured, [2, 3, 1, 4, 5]);
  });

  test('长按后手指大幅上滑(超过容差) → 判定为滚动, 不触发排序', async ({ page }) => {
    await blockExternal(page);
    const captured = await mockAppApis(page, { me: TEST_USER });

    await page.goto('/');
    await settleAnimations(page);

    const sb = await page.locator('[data-id="3"]').boundingBox();
    const startY = sb.y + sb.height / 2;

    // 按下后立刻移动 80px(远大于 6px 容差) → 长按被取消
    await dispatchTouch(page, '[data-id="3"]', 'touchstart', startY);
    await dispatchTouch(page, '[data-id="3"]', 'touchmove', startY - 80);
    await page.waitForTimeout(450);
    await dispatchTouch(page, '[data-id="3"]', 'touchend', startY - 80);

    // 没有任何排序请求
    expect(captured.reorder).toHaveLength(0);
  });
});
