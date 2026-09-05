import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive } from 'vue';

// Mock API module with correct method names matching src/api/index.js
// updateNote / getNote 默认 resolve, 供 _persistCurrentEdit / goBackToPreviousNote 调用
vi.mock('@/api/index.js', () => ({
  default: {
    getNotes: vi.fn().mockResolvedValue([]),
    getNote: vi.fn().mockResolvedValue(null),
    createNote: vi.fn(),
    updateNote: vi.fn().mockResolvedValue({}),
    deleteNote: vi.fn(),
    togglePin: vi.fn(),
    getCategories: vi.fn().mockResolvedValue([]),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  }
}));

import API from '@/api/index.js';

let store;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const module = await import('@/store/index.js');
  store = module.store;
  store.notes = [];
  store.categories = [];
  store.selectedCategoryId = null;
  store.searchQuery = '';
  store.showPinnedOnly = false;
  store.editingNote = null;
});

describe('store - computed properties', () => {
  it('allNotesCount returns correct count', () => {
    store.notes = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(store.allNotesCount).toBe(3);
  });

  it('selectedCategoryName returns empty when no category selected', () => {
    store.selectedCategoryId = null;
    expect(store.selectedCategoryName).toBe('');
  });

  it('selectedCategoryName returns correct name', () => {
    store.categories = [
      { id: 1, name: 'Work' },
      { id: 2, name: 'Personal' },
    ];
    store.selectedCategoryId = 2;
    expect(store.selectedCategoryName).toBe('Personal');
  });
});

describe('store - categoryTree', () => {
  it('builds tree from flat list', () => {
    store.categories = [
      { id: 1, name: 'B', parent_id: null },
      { id: 2, name: 'A', parent_id: null },
      { id: 3, name: 'B-child', parent_id: 1 },
    ];
    const tree = store.categoryTree;
    expect(tree.length).toBe(2);
    expect(tree[0].name).toBe('A');
    expect(tree[1].name).toBe('B');
    expect(tree[1].children.length).toBe(1);
    expect(tree[1].children[0].name).toBe('B-child');
    expect(tree[1].children[0].depth).toBe(1);
  });

  it('returns empty array when no categories', () => {
    store.categories = [];
    expect(store.categoryTree).toEqual([]);
  });
});

describe('store - filteredNotes', () => {
  beforeEach(() => {
    store.notes = [
      { id: 1, title: 'Hello World', content: 'foo bar', is_pinned: false, category_ids: [1] },
      { id: 2, title: 'Pinned Note', content: 'important', is_pinned: true, category_ids: [2] },
      { id: 3, title: 'Another Note', content: 'hello again', is_pinned: false, category_ids: [] },
    ];
    store.categories = [
      { id: 1, name: 'Work', parent_id: null },
      { id: 2, name: 'Personal', parent_id: null },
    ];
  });

  it('returns all notes when no filter', () => {
    store.searchQuery = '';
    store.selectedCategoryId = null;
    store.showPinnedOnly = false;
    expect(store.filteredNotes.length).toBe(3);
  });

  it('filters by search query (title match)', () => {
    store.searchQuery = 'hello';
    const result = store.filteredNotes;
    expect(result.length).toBe(2);
    expect(result.map(n => n.id)).toContain(1);
    expect(result.map(n => n.id)).toContain(3);
  });

  it('filters by search query (content match)', () => {
    store.searchQuery = 'important';
    const result = store.filteredNotes;
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(2);
  });

  it('filters by pinned only', () => {
    store.showPinnedOnly = true;
    const result = store.filteredNotes;
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(2);
  });
});

describe('store - filteredCategoryTree', () => {
  it('returns full tree when no search', () => {
    store.categories = [
      { id: 1, name: 'Work', parent_id: null },
      { id: 2, name: 'Personal', parent_id: null },
    ];
    store.categorySearchQuery = '';
    expect(store.filteredCategoryTree.length).toBe(2);
  });

  it('filters categories by name with ancestor chain', () => {
    store.categories = [
      { id: 1, name: 'Parent', parent_id: null },
      { id: 2, name: 'Child Target', parent_id: 1 },
      { id: 3, name: 'Unrelated', parent_id: null },
    ];
    store.categorySearchQuery = 'target';
    const tree = store.filteredCategoryTree;
    const allNames = [];
    function collect(nodes) {
      nodes.forEach(n => { allNames.push(n.name); collect(n.children); });
    }
    collect(tree);
    expect(allNames).toContain('Parent');
    expect(allNames).toContain('Child Target');
    expect(allNames).not.toContain('Unrelated');
  });
});

describe('store - toast', () => {
  it('showToast sets toast state', () => {
    store.showToast('Test message', 'error');
    expect(store.toast.show).toBe(true);
    expect(store.toast.message).toBe('Test message');
    expect(store.toast.type).toBe('error');
  });

  it('showToast defaults to success type', () => {
    store.showToast('OK');
    expect(store.toast.type).toBe('success');
  });
});

describe('store - navigation', () => {
  it('selectCategory sets selectedCategoryId', () => {
    store.selectCategory(5);
    expect(store.selectedCategoryId).toBe(5);
    expect(store.searchQuery).toBe('');
  });

  it('selectAllNotes clears category and search', () => {
    store.selectedCategoryId = 5;
    store.searchQuery = 'hello';
    store.selectAllNotes();
    expect(store.selectedCategoryId).toBe(null);
    expect(store.searchQuery).toBe('');
  });

  it('togglePinnedFilter toggles state', () => {
    expect(store.showPinnedOnly).toBe(false);
    store.togglePinnedFilter();
    expect(store.showPinnedOnly).toBe(true);
    store.togglePinnedFilter();
    expect(store.showPinnedOnly).toBe(false);
  });
});

describe('store - editor operations', () => {
  it('openNote sets editor state', () => {
    const note = {
      id: 1,
      title: 'Test',
      content: '<p>HTML content</p>',
      category_ids: [1, 2]
    };
    store.openNote(note);
    expect(store.editingNote).toEqual({ ...note });
    expect(store.editTitle).toBe('Test');
    expect(store.editContent).toBe('<p>HTML content</p>');
    expect(store.editCategoryIds).toEqual([1, 2]);
    expect(store.editMode).toBe('markdown');
  });

  it('openNote detects plain mode', () => {
    const note = {
      id: 2,
      title: 'Plain Note',
      content: '# Title\n\nSome text',
      category_ids: []
    };
    store.openNote(note);
    expect(store.editMode).toBe('plain');
  });

  it('setEditMode changes mode', () => {
    store.editMode = 'plain';
    store.setEditMode('markdown');
    expect(store.editMode).toBe('markdown');
  });

  it('setEditMode ignores invalid mode', () => {
    store.editMode = 'plain';
    store.setEditMode('invalid');
    expect(store.editMode).toBe('plain');
  });

  it('openNewNoteDialog opens dialog', () => {
    store.openNewNoteDialog();
    expect(store.newNoteDialogOpen).toBe(true);
  });
});

describe('store - category dialog', () => {
  it('editCategory opens edit dialog with category data', () => {
    const cat = { id: 1, name: 'Work', color: '#ff0000', parent_id: null };
    store.editCategory(cat);
    expect(store.showEditCategoryDialog).toBe(true);
    expect(store.editingCategoryId).toBe(1);
    expect(store.categoryForm.name).toBe('Work');
    expect(store.categoryForm.color).toBe('#ff0000');
  });

  it('cancelCategoryDialog resets state', () => {
    store.showNewCategoryDialog = true;
    store.showEditCategoryDialog = true;
    store.editingCategoryId = 1;
    store.categoryForm = { name: 'Test', color: '#000', parent_id: 5 };
    store.cancelCategoryDialog();
    expect(store.showNewCategoryDialog).toBe(false);
    expect(store.showEditCategoryDialog).toBe(false);
    expect(store.editingCategoryId).toBe(null);
    expect(store.categoryForm.name).toBe('');
  });
});

// ===== 笔记导航历史 (新增: 回到上一条笔记) =====
describe('store - noteHistory', () => {
  it('openNote pushes previous note into history', () => {
    store.notes = [
      { id: 1, title: 'A', content: '', category_ids: [] },
      { id: 2, title: 'B', content: '', category_ids: [] },
    ];
    store.openNote(store.notes[0]);
    expect(store.noteHistory).toEqual([]);
    store.openNote(store.notes[1]);
    expect(store.noteHistory).toEqual([1]);
  });

  it('openNote does not push when opening same note', () => {
    store.notes = [{ id: 1, title: 'A', content: '', category_ids: [] }];
    store.openNote(store.notes[0]);
    store.openNote(store.notes[0]); // 重复打开同一篇
    expect(store.noteHistory).toEqual([]);
  });

  it('goBackToPreviousNote pops history and opens previous', async () => {
    store.notes = [
      { id: 1, title: 'A', content: '', category_ids: [] },
      { id: 2, title: 'B', content: '', category_ids: [] },
    ];
    store.openNote(store.notes[0]);
    store.openNote(store.notes[1]);
    const ok = await store.goBackToPreviousNote();
    expect(ok).toBe(true);
    expect(store.editingNote.id).toBe(1);
    expect(store.noteHistory).toEqual([]);
  });

  it('goBackToPreviousNote on empty history returns false', async () => {
    const ok = await store.goBackToPreviousNote();
    expect(ok).toBe(false);
    expect(store.editingNote).toBe(null);
  });

  it('clearNoteHistory empties the stack', () => {
    store.notes = [
      { id: 1, title: 'A', content: '', category_ids: [] },
      { id: 2, title: 'B', content: '', category_ids: [] },
    ];
    store.openNote(store.notes[0]);
    store.openNote(store.notes[1]);
    expect(store.noteHistory.length).toBe(1);
    store.clearNoteHistory();
    expect(store.noteHistory).toEqual([]);
  });

  it('goBackToPreviousNote skips deleted notes in history', async () => {
    store.notes = [
      { id: 1, title: 'A', content: '', category_ids: [] },
      { id: 2, title: 'B', content: '', category_ids: [] },
      { id: 3, title: 'C', content: '', category_ids: [] },
    ];
    // 模拟: A → B → C, 然后 B 被删
    store.openNote(store.notes[0]);
    store.openNote(store.notes[1]);
    store.openNote(store.notes[2]);
    expect(store.noteHistory).toEqual([1, 2]);
    // 删除 B
    store.notes = store.notes.filter(n => n.id !== 2);
    // 回退: 应该跳过 B, 直接到 A
    const ok = await store.goBackToPreviousNote();
    expect(ok).toBe(true);
    expect(store.editingNote.id).toBe(1);
  });

  it('goBackToPreviousNote falls back to API when note is in another category', async () => {
    // 模拟跨分类: store.notes 只有当前分类的 C, 但历史栈里是别的分类的 A
    store.notes = [{ id: 3, title: 'C', content: '', category_ids: [] }];
    const crossCatNote = { id: 1, title: 'A-其他分类', content: '', category_ids: [9] };
    API.getNote.mockResolvedValue(crossCatNote);
    store.editingNote = { ...store.notes[0] };
    store.noteHistory.push(1);
    const ok = await store.goBackToPreviousNote();
    expect(ok).toBe(true);
    expect(API.getNote).toHaveBeenCalledWith(1);
    expect(store.editingNote.id).toBe(1);
    expect(store.editingNote.title).toBe('A-其他分类');
  });

  it('goBackToPreviousNote skips notes that API also cannot find', async () => {
    API.getNote.mockRejectedValue(new Error('404'));
    store.notes = [{ id: 3, title: 'C', content: '', category_ids: [] }];
    store.editingNote = { ...store.notes[0] };
    // 栈里只有一条且查不到 → 返回 false
    store.noteHistory.push(99);
    const ok = await store.goBackToPreviousNote();
    expect(ok).toBe(false);
  });
});

// ===== 切换笔记时的保存竞态 (回归测试) =====
// 背景: openNote 里 fire-and-forget 调 _persistCurrentEdit 保存老笔记。
// 若该函数在 await 之后才读 store.editTitle, 此时 openNote 已把 editTitle
// 换成新笔记的标题 → 老笔记的本地条目被污染成新笔记标题 (列表显示错, 数据库却是对的)
describe('store - 切换笔记保存竞态', () => {
  it('切换笔记后, 老笔记本地标题不被新笔记标题覆盖', async () => {
    API.updateNote.mockClear();
    store.notes = [
      { id: 1, title: 'A原标题', content: '', category_ids: [] },
      { id: 2, title: 'B新笔记', content: '', category_ids: [] },
    ];
    store.openNote(store.notes[0]);
    store.editTitle = 'A改过的标题'; // 用户改了标题, 还没等到 1s 自动保存
    store.openNote(store.notes[1]);  // 立刻切走 → 触发 _persistCurrentEdit
    await new Promise(r => setTimeout(r, 0)); // 让 fire-and-forget 的 await 链走完
    expect(store.notes[0].title).toBe('A改过的标题');
    expect(API.updateNote).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'A改过的标题' }));
  });

  it('切换笔记后, 老笔记本地分类不被新笔记分类覆盖', async () => {
    API.updateNote.mockClear();
    store.notes = [
      { id: 1, title: 'A', content: '', category_ids: [11] },
      { id: 2, title: 'B', content: '', category_ids: [22] },
    ];
    store.openNote(store.notes[0]);
    store.editCategoryIds = [11];
    store.openNote(store.notes[1]);
    await new Promise(r => setTimeout(r, 0));
    expect(store.notes[0].category_ids).toEqual([11]);
    expect(API.updateNote).toHaveBeenCalledWith(1, expect.objectContaining({ category_ids: [11] }));
  });
});

describe('store - utilities', () => {
  it('stripHtml removes HTML tags', () => {
    expect(store.stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    expect(store.stripHtml('')).toBe('');
    expect(store.stripHtml(null)).toBe('');
  });
});
