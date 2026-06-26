import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive } from 'vue';

// Mock API module with correct method names matching src/api/index.js
vi.mock('@/api/index.js', () => ({
  default: {
    getNotes: vi.fn().mockResolvedValue([]),
    getNote: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
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
    expect(store.editMode).toBe('rich');
  });

  it('openNote detects markdown mode', () => {
    const note = {
      id: 2,
      title: 'MD Note',
      content: '# Title\n\nSome text',
      category_ids: []
    };
    store.openNote(note);
    expect(store.editMode).toBe('markdown');
  });

  it('setEditMode changes mode', () => {
    store.editMode = 'rich';
    store.setEditMode('markdown');
    expect(store.editMode).toBe('markdown');
  });

  it('setEditMode ignores invalid mode', () => {
    store.editMode = 'rich';
    store.setEditMode('invalid');
    expect(store.editMode).toBe('rich');
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

describe('store - utilities', () => {
  it('stripHtml removes HTML tags', () => {
    expect(store.stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    expect(store.stripHtml('')).toBe('');
    expect(store.stripHtml(null)).toBe('');
  });
});
