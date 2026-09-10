import { describe, it, expect } from 'vitest';
import {
  resizeSidebar,
  resizeList,
  MIN_SIDEBAR,
  MIN_LIST,
  COLLAPSE_AT,
  EXPAND_DRAG
} from '@/utils/layout.js';

// 1920 视口, 编辑器最少 320 → 左两栏可用 1600
const AVAIL = 1600;
const base = (over = {}) => ({
  delta: 0,
  sidebarWidth: 264,
  listWidth: 340,
  sidebarCollapsed: false,
  noteListCollapsed: false,
  pairTotal: 604, // 264 + 340
  collapsedDrag: 0,
  avail: AVAIL,
  ...over
});

describe('三栏布局宽度计算', () => {
  it('往右拖: 分类栏变宽, 列表等宽变窄 (此消彼长, 编辑器不动)', () => {
    const r = resizeSidebar(base({ delta: 100 }));
    expect(r.sidebarWidth).toBe(364);
    expect(r.listWidth).toBe(240); // 604 - 364
    expect(r.noteListCollapsed).toBe(false);
  });

  it('往右拖到底: 列表被挤到放不下 → 列表被取缔', () => {
    // 拖到列表只剩 100px (< COLLAPSE_AT 120) 就该消失
    const r = resizeSidebar(base({ delta: 244 })); // w=508, newList=96
    expect(r.noteListCollapsed).toBe(true);
    expect(r.sidebarWidth).toBe(508);
  });

  it('取缔列表后继续右拖: 分类栏最多吃掉 pairTotal', () => {
    const r = resizeSidebar(base({ delta: 900 }));
    expect(r.noteListCollapsed).toBe(true);
    expect(r.sidebarWidth).toBe(604); // 止于 pairTotal, 不侵占编辑器
  });

  it('往左拖: 分类栏变窄, 列表等宽变宽', () => {
    const r = resizeSidebar(base({ delta: -64 }));
    expect(r.sidebarWidth).toBe(200);
    expect(r.listWidth).toBe(404); // 604 - 200
    expect(r.sidebarCollapsed).toBe(false);
  });

  it('往左拖过阈值: 分类栏收起, 宽度全给列表', () => {
    const r = resizeSidebar(base({ delta: -200 })); // w=64 < 120
    expect(r.sidebarCollapsed).toBe(true);
    expect(r.listWidth).toBe(604);
  });

  it('收起后往回拖够距离才重新拉出来', () => {
    const collapsed = base({ sidebarCollapsed: true });
    // 只拖一点点不该弹出来
    expect(resizeSidebar({ ...collapsed, delta: 10 }).sidebarCollapsed).toBe(true);
    // 累计够 EXPAND_DRAG 才展开
    const r = resizeSidebar({ ...collapsed, delta: EXPAND_DRAG + 5 });
    expect(r.sidebarCollapsed).toBe(false);
    expect(r.sidebarWidth).toBeGreaterThanOrEqual(MIN_SIDEBAR);
  });

  it('收起状态下反向拖不会误展开', () => {
    const r = resizeSidebar(base({ sidebarCollapsed: true, delta: -50 }));
    expect(r.sidebarCollapsed).toBe(true);
    expect(r.collapsedDrag).toBe(0); // 计数被重置
  });

  it('列表分隔条: 往左拖过阈值 → 列表收起', () => {
    const r = resizeList({ delta: -250, listWidth: 340, noteListCollapsed: false, avail: 1000, collapsedDrag: 0 });
    expect(r.noteListCollapsed).toBe(true);
  });

  it('列表分隔条: 往右拖不会超过编辑器最小宽度', () => {
    const r = resizeList({ delta: 5000, listWidth: 340, noteListCollapsed: false, avail: 1000, collapsedDrag: 0 });
    expect(r.listWidth).toBe(1000);
  });

  it('列表收起后往回拖够距离可展开', () => {
    const r = resizeList({
      delta: EXPAND_DRAG + 1, listWidth: 340, noteListCollapsed: true, avail: 1000, collapsedDrag: 0
    });
    expect(r.noteListCollapsed).toBe(false);
  });
});
