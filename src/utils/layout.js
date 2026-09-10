// 三栏布局的宽度计算 — 纯函数, 不依赖 DOM, 便于单测
//
// 布局: [分类栏] | [笔记列表] | [编辑器(flex-1)]
// 规则 (Blender 风格):
//   1. 一条分隔条只影响它左右相邻的两栏, 此消彼长
//   2. 某栏被拖窄到 COLLAPSE_AT 以下 → 该栏收起, 宽度让给邻居
//   3. 某栏被拖宽到邻居放不下 (邻居 < COLLAPSE_AT) → 邻居被"取缔"收起
//   4. 收起后继续往回拖够 EXPAND_DRAG 距离 → 重新拉出来
//
// 注意: 编辑器是 flex-1, 如果不主动调整邻居宽度, 拖宽左栏只会挤编辑器,
// 相邻栏纹丝不动 → "取缔"永远不会触发。所以计算里必须显式维护 pairTotal。

export const MIN_SIDEBAR = 180;
export const MIN_LIST = 220;
export const MIN_EDITOR = 320;
export const COLLAPSE_AT = 120;  // 窄于此值收起这一栏
export const EXPAND_DRAG = 36;   // 收起后往回拖多少距离才重新拉出

/**
 * 拖拽「分类栏 | 笔记列表」之间的分隔条
 * @param {object} s 当前状态
 * @param {number} s.delta 本次指针位移 (正=向右)
 * @param {number} s.sidebarWidth
 * @param {number} s.listWidth
 * @param {boolean} s.sidebarCollapsed
 * @param {boolean} s.noteListCollapsed
 * @param {number} s.pairTotal 拖拽开始时两栏宽度之和 (此消彼长的基准)
 * @param {number} s.collapsedDrag 收起状态下累计的回拖距离
 * @param {number} s.avail 左两栏可用总宽 = 视口宽 - MIN_EDITOR
 * @returns 新的状态 (不含 delta)
 */
export function resizeSidebar(s) {
  const { delta, sidebarWidth, listWidth, pairTotal, avail } = s;
  let collapsedDrag = s.collapsedDrag || 0;
  let sidebarCollapsed = s.sidebarCollapsed;
  let noteListCollapsed = s.noteListCollapsed;
  let w = sidebarWidth;
  let l = listWidth;

  // 已收起: 往回拖够距离才重新拉出来
  if (sidebarCollapsed) {
    collapsedDrag += delta;
    if (collapsedDrag >= EXPAND_DRAG) {
      return {
        sidebarWidth: Math.min(MIN_SIDEBAR, Math.max(0, avail - MIN_LIST)),
        listWidth: Math.max(MIN_LIST, pairTotal - MIN_SIDEBAR),
        sidebarCollapsed: false,
        noteListCollapsed: MIN_SIDEBAR + MIN_LIST > avail ? true : noteListCollapsed,
        collapsedDrag: 0
      };
    }
    return {
      sidebarWidth, listWidth, sidebarCollapsed, noteListCollapsed,
      collapsedDrag: collapsedDrag <= -EXPAND_DRAG ? 0 : collapsedDrag
    };
  }

  w = sidebarWidth + delta;

  // 往左拖到很窄 → 分类栏收起, 宽度全给列表
  if (w < COLLAPSE_AT) {
    return {
      sidebarWidth,
      listWidth: Math.max(MIN_LIST, Math.min(pairTotal, avail)),
      sidebarCollapsed: true,
      noteListCollapsed,
      collapsedDrag: 0
    };
  }

  // 往右拖: 从列表身上抢宽度, 两者此消彼长
  const newList = pairTotal - w;
  if (newList < COLLAPSE_AT) {
    // 列表放不下 → 取缔它
    return {
      sidebarWidth: Math.min(Math.max(w, MIN_SIDEBAR), Math.min(pairTotal, avail)),
      listWidth,
      sidebarCollapsed: false,
      noteListCollapsed: true,
      collapsedDrag: 0
    };
  }
  noteListCollapsed = false;
  const cappedList = Math.max(MIN_LIST, Math.min(newList, avail - MIN_SIDEBAR));
  return {
    sidebarWidth: Math.max(MIN_SIDEBAR, pairTotal - cappedList),
    listWidth: cappedList,
    sidebarCollapsed: false,
    noteListCollapsed,
    collapsedDrag: 0
  };
}

/**
 * 拖拽「笔记列表 | 编辑器」之间的分隔条
 * 编辑器是 flex-1, 会自己吃掉剩余空间, 所以这里只管列表宽度和收起
 */
export function resizeList(s) {
  const { delta, listWidth, avail } = s;
  let collapsedDrag = s.collapsedDrag || 0;
  let noteListCollapsed = s.noteListCollapsed;
  let l = listWidth;

  if (noteListCollapsed) {
    collapsedDrag += delta;
    if (collapsedDrag >= EXPAND_DRAG) {
      return {
        listWidth: Math.max(MIN_LIST, Math.min(listWidth || MIN_LIST, avail)),
        noteListCollapsed: false,
        collapsedDrag: 0
      };
    }
    return {
      listWidth,
      noteListCollapsed,
      collapsedDrag: collapsedDrag <= -EXPAND_DRAG ? 0 : collapsedDrag
    };
  }

  l = listWidth + delta;
  // 往左拖到很窄 → 列表收起, 空间给编辑器
  if (l < COLLAPSE_AT) {
    return { listWidth, noteListCollapsed: true, collapsedDrag: 0 };
  }
  // 往右拖: 编辑器让空间, 但不小于 MIN_EDITOR (已体现在 avail 里)
  return {
    listWidth: Math.max(MIN_LIST, Math.min(l, avail)),
    noteListCollapsed: false,
    collapsedDrag: 0
  };
}
