// QuickMark - 全局响应式 store (Vue 3 reactive singleton)
// 阶段 1: 保持原 public/js/store.js 行为零变化, 仅做模块化拆分。
// 字段/方法名/语义 与原文件 1:1 对应, 组件通过 import { store } from '@/store' 拿。
import { reactive, computed, watch } from 'vue';
import API from '@/api/index.js';
import { detectContentMode } from '@/utils/content.js';
import {
  parseWikiLinks,
  findNoteByTitle,
  buildLinkIndex,
  findBacklinks,
  findOutlinks,
  buildGraphData
} from '@/utils/wiki-link.js';

// --- private timers ---
let autoSaveTimer = null;
let toastTimer = null;
let searchTimer = null;

// --- viewport tracking ---
const viewport = reactive({
  width: typeof window !== 'undefined' ? window.innerWidth : 1280
});
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    viewport.width = window.innerWidth;
  }, { passive: true });
}

export const store = reactive({
  // ===== Auth =====
  currentUser: null, // { id, username, displayName, role } | null

  // ===== Data =====
  notes: [],
  categories: [],
  searchQuery: '',     // 笔记搜索 (NoteList 顶部那个)
  categorySearchQuery: '', // 分类搜索 (Sidebar 顶部那个, 模糊过滤分类树)
  selectedCategoryId: null,
  showPinnedOnly: false,

  // ===== Editor =====
  editingNote: null,
  editTitle: '',
  editContent: '',
  editCategoryIds: [],
  editLinks: [], // Wiki 链接标题列表
  markdownAssistEnabled: true,
  editMode: 'plain', // 'plain' (纯文本) | 'markdown' (Markdown + 预览)
  // 编辑器 UI 状态
  editorPreviewVisible: true, // Markdown 模式下显示预览面板
  editorImageUploading: false, // 上传中标记 (防重复点击)
  backlinkPanelVisible: true,  // 反向链接面板展开
  knowledgeGraphVisible: false, // 知识图谱浮层

  // ===== Theme =====
  theme: 'light', // 'light' | 'dark'

  // ===== UI state =====
  mobileDrawerOpen: false,
  sidebarCollapsed: false, // 桌面端侧边栏折叠
  noteListCollapsed: false, // 桌面端笔记列表折叠
  shortcutPanelVisible: false,
  userGuideVisible: false,
  showNewCategoryDialog: false,
  showEditCategoryDialog: false,
  newNoteDialogOpen: false, // 新建笔记前先选分类 (v1.1: 替代直接 createNote)
  categoryForm: { name: '', color: '#5B8DEF', parent_id: null },
  editingCategoryId: null,

  // 新手引导已在 1.0 移除 (改用首次空态轻提示 + 使用指南承接)
  // 保留 initOnboarding 仅作 v0 迁移: 清除老用户浏览器里的 localStorage 标记
  onboardingDismissed: false,

  // ===== Toast =====
  toast: { show: false, message: '', type: 'success' },

  // ===== Viewport computed =====
  isMobile: computed(() => viewport.width <= 768),
  isTablet: computed(() => viewport.width > 768 && viewport.width <= 1024),
  isDesktop: computed(() => viewport.width > 1024),
  isCompact: computed(() => viewport.width <= 1024),

  // ===== Computed =====
  selectedCategoryName: computed(() => {
    if (!store.selectedCategoryId) return '';
    const cat = store.categories.find(c => c.id === store.selectedCategoryId);
    return cat ? cat.name : '';
  }),

  allNotesCount: computed(() => store.notes.length),

  categoryListVersion: Date.now(),
  // 分类树 (按 parent_id 嵌套, 顶级在前, 同级按 position 排序)
  categoryTree: computed(() => {
    const _v = store.categoryListVersion;
    const all = store.categories || [];
    const byParent = new Map();
    for (const c of all) {
      const key = c.parent_id == null ? '__root__' : c.parent_id;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(c);
    }
    function build(parentKey, depth) {
      const children = byParent.get(parentKey) || [];
      children.sort((a, b) => (a.position || 0) - (b.position || 0));
      return children.map(c => ({
        ...c,
        depth,
        children: build(c.id, depth + 1)
      }));
    }
    return build('__root__', 0);
  }),

  // 分类搜索: 模糊匹配分类名, 命中分类 + 其祖先 + 后代完整路径
  filteredCategoryTree: computed(() => {
    const q = (store.categorySearchQuery || '').trim().toLowerCase();
    if (!q) return store.categoryTree;
    const all = store.categories || [];
    // 1. 找出所有命中分类 id
    const matchedIds = new Set();
    for (const c of all) {
      if ((c.name || '').toLowerCase().includes(q)) matchedIds.add(c.id);
    }
    if (matchedIds.size === 0) return [];
    // 2. 给命中分类补全所有祖先 (让路径完整)
    const byId = new Map(all.map(c => [c.id, c]));
    const needShow = new Set(matchedIds);
    for (const id of matchedIds) {
      let cur = byId.get(id);
      while (cur && cur.parent_id != null) {
        if (needShow.has(cur.parent_id)) break;
        needShow.add(cur.parent_id);
        cur = byId.get(cur.parent_id);
      }
    }
    // 3. 重建过滤后的树
    const byParent = new Map();
    for (const c of all) {
      if (!needShow.has(c.id)) continue;
      const key = c.parent_id == null ? '__root__' : c.parent_id;
      // 父级不在展示集合里 → 提到根 (避免树断裂)
      const effectiveKey = needShow.has(c.parent_id) ? key : '__root__';
      if (!byParent.has(effectiveKey)) byParent.set(effectiveKey, []);
      byParent.get(effectiveKey).push(c);
    }
    function build(parentKey, depth) {
      const children = byParent.get(parentKey) || [];
      children.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
      return children.map(c => ({
        ...c,
        depth,
        // 后代可能被过滤掉, 这里递归调用, 树自动收窄
        children: build(c.id, depth + 1)
      }));
    }
    return build('__root__', 0);
  }),

  // 展开状态 (按分类 id 记录)
  expandedCategoryIds: new Set(),

  toggleCategoryExpanded(id) {
    if (store.expandedCategoryIds.has(id)) store.expandedCategoryIds.delete(id);
    else store.expandedCategoryIds.add(id);
    // 触发响应式 (Set 没有 reactive 包装,需要 forceUpdate)
    store.expandedCategoryIds = new Set(store.expandedCategoryIds);
  },
  isCategoryExpanded(id) {
    return store.expandedCategoryIds.has(id);
  },

  // 当前可见分类树的最大展开深度 (从 0 开始, 顶级 = 0)
  // 用来给侧边栏加宽度, 深层展开时整个右侧右移, 给名字留位
  maxExpandedDepth: computed(() => {
    let max = 0;
    function walk(nodes) {
      for (const n of nodes) {
        if (!n.children || n.children.length === 0) continue;
        if (!store.expandedCategoryIds.has(n.id)) continue;
        max = Math.max(max, n.depth + 1);
        walk(n.children);
      }
    }
    walk(store.categoryTree);
    return max;
  }),

  // 给定分类 id, 返回该分类及其所有后代的扁平 id 列表 (供前端构建子树)
  getDescendantIdsFlat(rootId) {
    const result = [];
    const stack = [rootId];
    const all = store.categories || [];
    while (stack.length > 0) {
      const cur = stack.pop();
      result.push(cur);
      for (const c of all) {
        if (c.parent_id === cur) stack.push(c.id);
      }
    }
    return result;
  },

  noteListVersion: Date.now(), // 拖拽排序后递增, 强制 filterNotes 重算
  filteredNotes: computed(() => {
    const _v = store.noteListVersion; // 依赖版本号
    let list = store.notes;
    if (store.showPinnedOnly) list = list.filter(n => n.is_pinned);
    // 前端二次过滤 (后端 search 通常只匹配标题; 这里补内容模糊)
    const q = (store.searchQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter(n => {
        const title = (n.title || '').toLowerCase();
        const content = (n.content || '').toLowerCase();
        return title.includes(q) || content.includes(q);
      });
    }
    return list;
  }),

  listTitle: computed(() => {
    if (store.searchQuery) return '搜索结果';
    if (store.showPinnedOnly) return '收藏';
    if (store.selectedCategoryId) return store.selectedCategoryName || '分类笔记';
    return '全部笔记';
  }),

  // editor stats
  charCount: computed(() => (store.editTitle?.length || 0) + (store.editContent?.length || 0)),
  wordCount: computed(() => {
    const txt = (store.editContent || '').trim();
    if (!txt) return 0;
    // 中文按字数,英文按词
    const cjk = (txt.match(/[\u4e00-\u9fa5]/g) || []).length;
    const en = (txt.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length;
    return cjk + en;
  }),
  readingTime: computed(() => {
    const mins = store.wordCount / 200;
    if (mins < 1) return '< 1 分钟';
    return Math.ceil(mins) + ' 分钟';
  }),

  // ===== Wiki 链接状态 (响应式, 依赖 store.notes) =====
  linkIndex: computed(() => buildLinkIndex(store.notes)),
  currentNoteBacklinks: computed(() => {
    if (!store.editingNote) return [];
    return findBacklinks(store.editingNote.id, store.notes, store.linkIndex);
  }),
  currentNoteOutlinks: computed(() => {
    if (!store.editingNote) return [];
    return findOutlinks(store.editingNote.id, store.notes, store.linkIndex);
  }),
  graphData: computed(() => buildGraphData(store.notes, store.linkIndex)),
  hasBacklinks: computed(() => store.currentNoteBacklinks.length > 0),
  hasOutlinks: computed(() => store.currentNoteOutlinks.length > 0),

  // ===== Toast =====
  showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    store.toast = { show: true, message, type };
    toastTimer = setTimeout(() => { store.toast.show = false; }, 2500);
  },

  // ===== Onboarding 兼容层 (v0 旧引导, v1 移除) =====
  // 老用户浏览器里可能还有 quickmark-onboarding-dismissed 标记, 一次性清理
  // 新代码不再读 onboardingDismissed, 改由 NoteList.vue 自己管理空态提示
  shouldShowOnboarding: computed(() => false),
  dismissOnboarding() { /* noop */ },
  initOnboarding() {
    try { localStorage.removeItem('quickmark-onboarding-dismissed'); } catch (e) {}
  },

  // ===== User Guide =====
  openUserGuide() { store.userGuideVisible = true; },
  closeUserGuide() { store.userGuideVisible = false; },
  toggleUserGuide() { store.userGuideVisible = !store.userGuideVisible; },

  // ===== Theme =====
  initTheme() {
    const saved = localStorage.getItem('quickmark-theme');
    if (saved === 'dark' || saved === 'light') {
      store.theme = saved;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      store.theme = prefersDark ? 'dark' : 'light';
    }
    store.applyTheme();

    // follow system changes if user has not chosen
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('quickmark-theme')) {
        store.theme = e.matches ? 'dark' : 'light';
        store.applyTheme();
      }
    });
  },
  applyTheme() {
    document.documentElement.setAttribute('data-theme', store.theme);
  },
  toggleTheme() {
    store.theme = store.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('quickmark-theme', store.theme);
    store.applyTheme();
  },

  // ===== Data loading =====
  async loadNotes() {
    try {
      store.showPinnedOnly = false;
      const params = {};
      if (store.searchQuery) params.search = store.searchQuery;
      if (store.selectedCategoryId) params.category_id = store.selectedCategoryId;
      const result = await API.getNotes(params);
      store.notes = result || [];
    } catch (err) {
      console.error('loadNotes error:', err);
      store.notes = [];
    }
  },

  async loadCategories() {
    try {
      store.categories = (await API.getCategories()) || [];
    } catch (err) {
      console.error('loadCategories error:', err);
      store.categories = [];
    }
  },

  async loadAll() {
    await Promise.all([store.loadNotes(), store.loadCategories()]);
  },

  // ===== Navigation =====
  selectAllNotes() {
    store.selectedCategoryId = null;
    store.searchQuery = '';
    store.mobileDrawerOpen = false;
    store.loadNotes();
  },

  selectCategory(id) {
    store.selectedCategoryId = id;
    store.searchQuery = '';
    store.mobileDrawerOpen = false;
    store.loadNotes();
  },

  togglePinnedFilter() {
    store.showPinnedOnly = !store.showPinnedOnly;
  },

  onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      store.selectedCategoryId = null;
      store.showPinnedOnly = false;
      store.loadNotes();
    }, 300);
  },

  // ===== Note operations =====
  // 打开新建笔记弹层 (v1.1: 先选分类再建, 避免笔记无家可归)
  openNewNoteDialog() {
    store.mobileDrawerOpen = false;
    store.newNoteDialogOpen = true;
  },

  // 真正创建笔记, 由 NewNoteDialog.vue 调
  // categoryId 必须有 (弹层已保证); title 可选, 默认 "新笔记"
  async createNote(categoryId = null, title = null) {
    store.mobileDrawerOpen = false;
    try {
      const payload = {
        title: title || '新笔记',
        content: ''
      };
      if (categoryId) {
        payload.category_ids = [categoryId];
      }
      const note = await API.createNote(payload);
      store.notes.unshift({
        ...note,
        category_ids: note.category_ids || [],
        category_names: []
      });
      store.openNote(note);
      store.showToast('已创建新笔记');
    } catch (err) {
      console.error('createNote error:', err);
      store.showToast('创建笔记失败: ' + (err.message || '未知错误'), 'error');
    }
  },

  openNote(note) {
    store.editingNote = { ...note };
    store.editTitle = note.title || '';
    store.editLinks = [];
    let content = note.content || '';
    const linkMatch = content.match(/<!--\s*qm-links:([^]*?)-->/);
    if (linkMatch) {
      try {
        const parsed = JSON.parse(linkMatch[1].trim());
        // 兼容旧格式: 纯字符串数组 → 统一转为 { title, annotation }
        if (Array.isArray(parsed)) {
          store.editLinks = parsed.map(item =>
            typeof item === 'string' ? { title: item, annotation: '' } : item
          );
        }
      } catch (e) {
        // 逗号分隔的旧格式
        store.editLinks = linkMatch[1].split(',').map(s => ({ title: s.trim(), annotation: '' })).filter(l => l.title);
      }
      content = content.replace(/<!--\s*qm-links:[\s\S]*?-->\s*/g, '').trim();
    } else {
      store.editLinks = [];
    }
    store.editContent = content;
    store.editCategoryIds = note.category_ids ? [...note.category_ids] : [];
    store.editMode = detectContentMode(store.editContent);
  },

  setEditMode(mode) {
    if (mode !== 'plain' && mode !== 'markdown') return;
    if (store.editMode === mode) return;
    store.editMode = mode;
  },

  closeEditor() {
    store.cancelAutoSave();
    // 嵌入链接到内容中再保存
    let saveContent = store.editContent || '';
    const links = [...store.editLinks];
    if (links.length > 0) {
      saveContent = (saveContent.replace(/<!--\s*qm-links:[\s\S]*?-->\s*/g, '').trim())
        + '\n<!-- qm-links:' + JSON.stringify(links) + ' -->';
    }
    const snapshot = store.editingNote
      ? { id: store.editingNote.id, title: store.editTitle, content: saveContent, catIds: [...store.editCategoryIds] }
      : null;
    store.editingNote = null;
    store.editTitle = '';
    store.editContent = '';
    store.editCategoryIds = [];
    store.editLinks = [];
    store.editMode = 'plain';
    store.editorPreviewVisible = true;
    if (snapshot && snapshot.id) {
      API.updateNote(snapshot.id, {
        title: snapshot.title || '无标题',
        content: snapshot.content || '',
        category_ids: snapshot.catIds
      }).then(() => {
        const idx = store.notes.findIndex(n => n.id === snapshot.id);
        if (idx !== -1) {
          const catNames = snapshot.catIds
            .map(cid => store.categories.find(c => c.id === cid)?.name)
            .filter(Boolean);
          store.notes[idx] = {
            ...store.notes[idx],
            title: snapshot.title || '无标题',
            content: snapshot.content || '',
            category_ids: [...snapshot.catIds],
            category_names: catNames
          };
        }
        store.loadCategories();
      }).catch(err => console.error('关闭笔记保存失败:', err));
    }
  },

  async saveCurrentNote() {
    if (!store.editingNote || !store.editingNote.id) return;
    const noteId = store.editingNote.id;
    // 构建内容: 去掉旧链接标记, 追加当前链接
    let content = (store.editContent || '').replace(/<!--\s*qm-links:[\s\S]*?-->\s*/g, '').trim();
    if (store.editLinks && store.editLinks.length > 0) {
      content += '\n<!-- qm-links:' + JSON.stringify(store.editLinks) + ' -->';
    }
    const data = {
      title: store.editTitle || '无标题',
      content: content,
      category_ids: store.editCategoryIds
    };
    try {
      const result = await API.updateNote(noteId, data);
      // 用 try-catch 包裹写入操作, 防止 editingNote 已被 closeEditor 置空时抛错
      try {
        if (store.editingNote && store.editingNote.id === noteId) {
          Object.assign(store.editingNote, result, {
            category_ids: store.editCategoryIds
          });
        }
        const idx = store.notes.findIndex(n => n.id === noteId);
        if (idx !== -1) {
          const catNames = store.editCategoryIds
            .map(cid => store.categories.find(c => c.id === cid)?.name)
            .filter(Boolean);
          store.notes[idx] = {
            ...store.notes[idx],
            title: data.title,
            content: data.content,
            category_ids: [...store.editCategoryIds],
            category_names: catNames
          };
        }
      } catch (e) {
        console.warn('保存后写入本地状态失败 (无碍):', e.message);
      }
    } catch (err) {
      console.error('保存失败:', err);
    }
  },

  async forceSave() {
    await store.saveCurrentNote();
    await store.loadCategories();
    store.showToast('已保存');
  },

  async deleteCurrentNote() {
    if (!store.editingNote) return;
    if (!confirm('确定删除这篇笔记吗？')) return;
    const noteId = store.editingNote.id;
    try {
      await API.deleteNote(noteId);
      store.notes = store.notes.filter(n => n.id !== noteId);
      store.editingNote = null;
      store.editTitle = '';
      store.editContent = '';
      store.editCategoryIds = [];
      store.editLinks = [];
      store.loadCategories();
      store.showToast('笔记已删除');
    } catch (err) {
      console.error('删除失败:', err);
      store.showToast('删除失败', 'error');
    }
  },

  // 从列表直接删除 (不需打开编辑器)
  async deleteNoteFromList(note) {
    if (!note || !note.id) return;
    const noteId = note.id;
    try {
      await API.deleteNote(noteId);
      // 关闭正在编辑的同一篇
      if (store.editingNote && store.editingNote.id === noteId) {
        store.editingNote = null;
        store.editTitle = '';
        store.editContent = '';
        store.editCategoryIds = [];
      store.editLinks = [];
      }
      store.notes = store.notes.filter(n => n.id !== noteId);
      await store.loadCategories();
      store.showToast('笔记已删除');
    } catch (err) {
      console.error('删除失败:', err);
      store.showToast('删除失败', 'error');
    }
  },

  togglePin() {
    if (!store.editingNote) return;
    // Prisma schema isPinned 是 Boolean, 发 0/1 (Int) 会被严格拒绝
    const newPinned = !store.editingNote.is_pinned;
    store.editingNote.is_pinned = newPinned;
    API.updateNote(store.editingNote.id, { is_pinned: newPinned ? true : false })
      .then(() => {
        const idx = store.notes.findIndex(n => n.id === store.editingNote.id);
        if (idx !== -1) store.notes[idx].is_pinned = newPinned;
        store.showToast(newPinned ? '已收藏' : '已取消收藏');
      })
      .catch(err => {
        console.error(err);
        store.editingNote.is_pinned = !newPinned;
        store.showToast('操作失败', 'error');
      });
  },

  toggleNoteCategory(catId) {
    const idx = store.editCategoryIds.indexOf(catId);
    if (idx === -1) store.editCategoryIds.push(catId);
    else store.editCategoryIds.splice(idx, 1);
    store.scheduleAutoSave();
  },

  // ===== Auto-save =====
  scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    // 快照当前笔记 id, 避免异步回调时 editingNote 已切换
    const noteId = store.editingNote ? store.editingNote.id : null;
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      if (noteId && store.editingNote && store.editingNote.id === noteId) {
        store.saveCurrentNote().then(() => store.loadCategories());
      }
    }, 1000);
  },
  cancelAutoSave() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
  },

  // ===== Category operations =====
  editCategory(cat) {
    store.showEditCategoryDialog = true;
    store.editingCategoryId = cat.id;
    store.categoryForm = { name: cat.name, color: cat.color, parent_id: cat.parent_id || null };
  },

  cancelCategoryDialog() {
    store.showNewCategoryDialog = false;
    store.showEditCategoryDialog = false;
    store.editingCategoryId = null;
    store.categoryForm = { name: '', color: '#5B8DEF', parent_id: null };
  },

  async saveCategory() {
    if (!store.categoryForm.name.trim()) {
      store.showToast('请输入分类名称', 'error');
      return;
    }
    try {
      const payload = {
        name: store.categoryForm.name,
        color: store.categoryForm.color,
        parent_id: store.categoryForm.parent_id || null
      };
      if (store.editingCategoryId) {
        await API.updateCategory(store.editingCategoryId, payload);
        store.showToast('分类已更新');
      } else {
        await API.createCategory(payload);
        store.showToast('分类已创建');
      }
      store.cancelCategoryDialog();
      await store.loadCategories();
    } catch (err) {
      store.showToast(err.message || '保存失败', 'error');
    }
  },

  async deleteCategory(cat) {
    // 统计子分类与笔记
    const hasChildren = store.categories.some(c => c.parent_id === cat.id);
    let msg = `确定删除分类「${cat.name}」吗?`;
    if (hasChildren) {
      const childNames = store.categories
        .filter(c => c.parent_id === cat.id)
        .map(c => c.name).join('、');
      msg += `\n\n将同时删除 ${childNames} 等子分类。`;
    }
    msg += '\n相关笔记不会受影响。';
    if (!confirm(msg)) return;
    try {
      await API.deleteCategory(cat.id);
      // 如果删除的是当前选中的或其祖先, 清空
      if (store.selectedCategoryId === cat.id) store.selectedCategoryId = null;
      await store.loadAll();
      store.showToast('分类已删除');
    } catch (err) {
      store.showToast('删除失败', 'error');
    }
  },

  // ===== Utils =====
  stripHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || div.innerText || '';
  },

  formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts.replace(' ', 'T'));
    const now = new Date();
    const diff = now - d;
    const dayMs = 24 * 60 * 60 * 1000;
    if (diff < dayMs && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 2 * dayMs) return '昨天';
    if (diff < 7 * dayMs) return Math.floor(diff / dayMs) + '天前';
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
});

// Auto-save watchers
watch(() => store.editTitle, () => store.scheduleAutoSave());
watch(() => store.editContent, () => store.scheduleAutoSave());

// Close mobile drawer when switching to desktop
watch(() => store.isDesktop, (desktop) => {
  if (desktop) store.mobileDrawerOpen = false;
});
