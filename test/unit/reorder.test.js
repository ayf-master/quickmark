import { describe, it, expect } from 'vitest';

// 重排核心逻辑的纯函数版本 (从 CategoryTreeNode.reorderCategory / NoteList.reorderNotes 抽出)
// 与组件实现保持一致: 拖到目标位置即换序, 与方向无关
function reorder(items, fromId, toId) {
  const sorted = [...items];
  const fromIdx = sorted.findIndex(n => n.id === fromId);
  const toIdx = sorted.findIndex(n => n.id === toId);
  if (fromIdx < 0 || toIdx < 0) return sorted;
  if (fromId === toId) return sorted;
  const [moved] = sorted.splice(fromIdx, 1);
  // 始终"插到 toIdx 位置": 拖到目标 = 换序到目标位置 (与从下往上方向一致)
  // 原来 fromIdx < toIdx 时用 toIdx - 1, 会让拖到紧邻下一项的操作变成 no-op
  const insertAt = toIdx;
  sorted.splice(insertAt, 0, moved);
  return sorted;
}

// 转成对象数组 (真实场景)
const objs = [
  { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }
];

describe('拖拽重排核心逻辑 (修复后: insertAt 始终 = toIdx)', () => {
  it('从下往上拖: 拖 D 到 B → D 替换 B 位置', () => {
    const result = reorder(objs, 4, 2);
    expect(result.map(o => o.id)).toEqual([1, 4, 2, 3, 5]);
  });

  // 用户报的 bug: 上→下拖到紧邻下一项之前是 no-op
  it('从上往下拖: 拖 A 到 B (紧邻) → A 替换 B 位置 [BUG 修复]', () => {
    const result = reorder(objs, 1, 2);
    expect(result.map(o => o.id)).toEqual([2, 1, 3, 4, 5]);
  });

  it('从上往下拖: 拖 A 到 D → A 替换 D 位置', () => {
    const result = reorder(objs, 1, 4);
    expect(result.map(o => o.id)).toEqual([2, 3, 4, 1, 5]);
  });

  it('从上往下拖: 拖 A 到 E → A 移到末尾', () => {
    const result = reorder(objs, 1, 5);
    expect(result.map(o => o.id)).toEqual([2, 3, 4, 5, 1]);
  });

  it('拖到自己 → 不变', () => {
    const result = reorder(objs, 3, 3);
    expect(result.map(o => o.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('拖到首项 (上→下拖 E 到 A) → E 替换 A 位置', () => {
    const result = reorder(objs, 5, 1);
    expect(result.map(o => o.id)).toEqual([5, 1, 2, 3, 4]);
  });

  it('原 toIdx-1 旧逻辑对比: 紧邻场景 (旧是 no-op, 新是换序)', () => {
    // 旧逻辑: insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx
    const oldLogic = [...objs];
    const fromIdx = 0, toIdx = 1;
    const insertAtOld = fromIdx < toIdx ? toIdx - 1 : toIdx;
    oldLogic.splice(fromIdx, 1);
    oldLogic.splice(insertAtOld, 0, { id: 1 });
    expect(oldLogic.map(o => o.id)).toEqual([1, 2, 3, 4, 5]); // 旧逻辑确实是 no-op

    // 新逻辑: insertAt = toIdx = 1
    const newLogic = reorder(objs, 1, 2);
    expect(newLogic.map(o => o.id)).toEqual([2, 1, 3, 4, 5]); // 新逻辑正常换序
  });
});
