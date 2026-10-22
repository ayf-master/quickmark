// E2E 共用: API mock + 登录态 + 请求捕获
// 所有 spec 都不连真实后端: 用 page.route 拦掉 /api/* 并返回 fixture,
// 断言重点是"前端行为 + 发给后端的请求载荷"(排序/保存的回归就体现在载荷里)
import { expect } from '@playwright/test';

export const TEST_USER = { id: 7, username: 'e2e', displayName: 'e2e', role: 'user' };

export const NOTE_FIXTURES = [
  { id: 1, title: '第一篇笔记', content: '<p>内容一</p>', is_pinned: false, position: 0, updated_at: '2026-10-20T10:00:00', category_names: ['前端'] },
  { id: 2, title: '第二篇笔记', content: '<p>内容二</p>', is_pinned: false, position: 1, updated_at: '2026-10-20T11:00:00', category_names: [] },
  { id: 3, title: '第三篇笔记', content: '<p>内容三</p>', is_pinned: false, position: 2, updated_at: '2026-10-20T12:00:00', category_names: [] },
  { id: 4, title: '第四篇笔记', content: '<p>内容四</p>', is_pinned: false, position: 3, updated_at: '2026-10-20T13:00:00', category_names: [] },
  { id: 5, title: '第五篇笔记', content: '<p>内容五</p>', is_pinned: false, position: 4, updated_at: '2026-10-20T14:00:00', category_names: [] }
];

export const CATEGORY_FIXTURES = [
  { id: 1, name: '前端', parent_id: null, position: 0, color: '#6366f1' },
  { id: 2, name: '后端', parent_id: null, position: 1, color: '#10b981' }
];

// 阻断外网字体(CDN), 让测试不依赖网络且加载更快
export async function blockExternal(page) {
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
}

// mock 登录接口: ok=false 时返回 401 (用户名或密码错误)
export async function mockLogin(page, { ok = true } = {}) {
  await page.route('**/api/auth/login', route => (ok
    ? route.fulfill({ json: { user: TEST_USER } })
    : route.fulfill({ status: 401, json: { error: '用户名或密码错误' } })));
}

// mock 主界面所需的全部接口; me 传 TEST_USER = 直接以登录态进入, 传 null = 显示登录页
// 返回 captured: { reorder: [PATCH /api/notes/reorder 载荷], updates: [PUT /api/notes/:id 载荷] }
export async function mockAppApis(page, { me = null } = {}) {
  const captured = { reorder: [], updates: [] };

  await page.route('**/api/auth/me', route => (me
    ? route.fulfill({ json: { user: me } })
    : route.fulfill({ status: 401, json: { error: '未登录' } })));

  await page.route('**/api/settings', route => route.fulfill({ json: { features: {} } }));
  await page.route('**/api/categories', route => route.fulfill({ json: CATEGORY_FIXTURES }));

  // 一条路由覆盖 /api/notes* 全家桶, 按 pathname+method 分派, 避免多条路由优先级歧义
  await page.route('**/api/notes**', async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === '/api/notes/reorder' && method === 'PATCH') {
      captured.reorder.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true } });
    }
    if (path.startsWith('/api/notes/') && method === 'PUT') {
      captured.updates.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true } });
    }
    if (path === '/api/notes' && method === 'GET') {
      return route.fulfill({ json: NOTE_FIXTURES });
    }
    return route.fulfill({ json: { ok: true } });
  });

  return captured;
}

// 等卡片入场动画(fade-in-up, 逐张 40ms 延迟)结束, 避免动画中的 transform 影响坐标计算
export async function settleAnimations(page) {
  await page.waitForSelector('[data-id]');
  await page.evaluate(() => Promise.all(
    document.getAnimations().map(a => a.finished.catch(() => {}))
  ));
}

// 在指定元素上合成触摸事件序列 (onNoteTouchStart/Move/End 读 e.touches[0].clientX/Y)
export async function dispatchTouch(page, selector, type, clientY) {
  await page.evaluate(({ selector, type, clientY }) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error('元素不存在: ' + selector);
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const touch = new Touch({ identifier: 1, target: el, clientX, clientY });
    el.dispatchEvent(new TouchEvent(type, {
      touches: type === 'touchend' ? [] : [touch],
      targetTouches: type === 'touchend' ? [] : [touch],
      changedTouches: [touch],
      bubbles: true,
      cancelable: true
    }));
  }, { selector, type, clientY });
}

// 等 PATCH reorder 请求发出并校验载荷
export async function expectReorder(page, captured, expectedIds) {
  await expect.poll(() => captured.reorder.length, { timeout: 8000 }).toBeGreaterThan(0);
  expect(captured.reorder[0]).toEqual({ ids: expectedIds });
}
