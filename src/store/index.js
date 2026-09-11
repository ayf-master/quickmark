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

// 新手引导步骤数 (内容定义在 components/OnboardingTour.vue)
export const ONBOARDING_TOTAL_STEPS = 6;

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
  notesLoading: false,
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
  editPlanData: null, // { start, end, progress, color } | null (计划甘特表)
  editLinks: [], // Wiki 链接标题列表
  markdownAssistEnabled: true,
  editMode: 'markdown', // 'plain' (纯文本) | 'markdown' (Markdown + 预览)
  defaultEditMode: (() => {
    try { return localStorage.getItem('quickmark-default-mode') || 'auto'; } catch { return 'auto'; }
  })(), // 'auto' | 'markdown' | 'plain' — 用户偏好, 打开笔记时优先于 detectContentMode
  // 编辑器 UI 状态
  editorPreviewVisible: true, // Markdown 模式下显示预览面板
  editorImageUploading: false, // 上传中标记 (防重复点击)
  backlinkPanelVisible: true,  // 反向链接面板展开
  knowledgeGraphVisible: false, // 知识图谱浮层
  // 图片全屏预览是否打开: main.js 的全局 Esc 靠它判断该关谁,
  // 不然预览里按 Esc 会同时命中全局 closeEditor, 把整个编辑器退掉
  imagePreviewVisible: false,
  // 从某条笔记内打开图谱时记录该笔记 id: 图谱里它和它的链接邻居会用不同颜色突出;
  // 从侧栏全局打开时为 null, 全部节点走常规着色
  graphFocusNoteId: null,

  // 笔记导航历史 (用于"回到上一条笔记")
  // 栈结构: 进入新笔记时把当前 editingNote.id 推入; 回退时弹栈打开
  // 上限 30 条, 超过自动丢最早
  noteHistory: [],
  // 前进栈 ("反撤回"): 回退时把当前笔记压入, 前进时弹出
  // 一旦用户点了新笔记 (非回退/前进产生的跳转), 前进栈要清空 (同浏览器行为)
  noteForward: [],

  // ===== Theme =====
  theme: 'light', // 'light' | 'dark'

  // ===== UI state =====
  mobileDrawerOpen: false,
  sidebarCollapsed: false, // 桌面端侧边栏折叠
  noteListCollapsed: false, // 桌面端笔记列表折叠

  // ===== 三栏宽度 (拖拽调节, 持久化到 localStorage) =====
  // 组件里仍用 var(--sidebar-width) / var(--list-width), 由 App.vue 用内联 style 覆盖
  // 这样不用改 Sidebar / NoteList 内部, 一处桥接即可
  sidebarWidth: (() => {
    try { return parseInt(localStorage.getItem('quickmark-sidebar-width')) || 264; } catch { return 264; }
  })(),
  listWidth: (() => {
    try { return parseInt(localStorage.getItem('quickmark-list-width')) || 340; } catch { return 340; }
  })(),
  shortcutPanelVisible: false,
  preferencePanelVisible: false,
  userGuideVisible: false,
  showNewCategoryDialog: false,
  showEditCategoryDialog: false,
  newNoteDialogOpen: false, // 新建笔记前先选分类 (v1.1: 替代直接 createNote)
  categoryForm: { name: '', color: '#5B6EF5', parent_id: null },
  editingCategoryId: null,

  // 新手引导 (v1.2+ 分步浮层式, 首次登录自动弹出)
  onboardingVisible: false,
  onboardingStep: 0,

  // ===== Toast =====
  toast: { show: false, message: '', type: 'success' },

  // ===== Viewport computed =====
  // 手机 ≤720 (覆盖 iPad mini 6 竖屏 744px 之前); 平板 721-1024; 桌面 >1024
  // 平板与桌面同屏布局 (侧栏+列表+编辑器并排), 仅宽度压缩
  isMobile: computed(() => viewport.width <= 720),
  isTablet: computed(() => viewport.width > 720 && viewport.width <= 1024),
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
      // position 相同 (常见于老数据 / 未拖拽排序过的) 时按名称兜底,
      // 保证顺序稳定可预期, 否则同级分类的先后会随数组插入顺序漂移
      children.sort((a, b) =>
        (a.position || 0) - (b.position || 0) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
      );
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
  graphData: computed(() => buildGraphData(store.graphNotes, store.graphLinkIndex)),
  graphLinkIndex: computed(() => buildLinkIndex(store.graphNotes)),
  graphNotes: [],
  hasBacklinks: computed(() => store.currentNoteBacklinks.length > 0),
  hasOutlinks: computed(() => store.currentNoteOutlinks.length > 0),

  // ===== Toast =====
  showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    store.toast = { show: true, message, type };
    toastTimer = setTimeout(() => { store.toast.show = false; }, 2500);
  },

  // ===== Onboarding Tour (v1.2+ 分步浮层引导) =====
  startOnboarding() {
    store.onboardingStep = 0;
    store.onboardingVisible = true;
  },
  nextOnboardingStep() {
    if (store.onboardingStep < ONBOARDING_TOTAL_STEPS - 1) {
      store.onboardingStep++;
    } else {
      store.dismissOnboarding();
    }
  },
  prevOnboardingStep() {
    if (store.onboardingStep > 0) {
      store.onboardingStep--;
    }
  },
  // 跳到任意步骤 (引导卡顶部 dots 可点击), 用于快速回顾之前讲过的功能
  goToOnboardingStep(i) {
    if (typeof i !== 'number') return;
    if (i < 0 || i >= ONBOARDING_TOTAL_STEPS) return;
    store.onboardingStep = i;
  },
  // Onboarding 完成标记按 userId 隔离: 不同账号各自记一次
  // (浏览器级 key 会导致同浏览器注册新用户也不弹, 已修)
  onboardingDoneKey() {
    const id = store.currentUser && store.currentUser.id != null
      ? String(store.currentUser.id)
      : 'guest';
    return `quickmark-onboarding-done-${id}`;
  },
  dismissOnboarding() {
    store.onboardingVisible = false;
    try { localStorage.setItem(store.onboardingDoneKey(), '1'); } catch (e) {}
  },
  initOnboarding() {
    // 一次性迁移: 清掉老版本浏览器级 key (从 v1.2 起按用户维度记录)
    try { localStorage.removeItem('quickmark-onboarding-dismissed'); } catch (e) {}
    try { localStorage.removeItem('quickmark-onboarding-done'); } catch (e) {}
    // 设计变更: 不再自动弹引导卡
    // 之前新用户首次登录会自动弹出, 用户反馈"每次刷新都弹"太打扰
    // 现在: 只在右上角齿轮菜单 → "新手引导" 才会启动 (onRestartOnboarding)
    // 所有账号默认 onboardingVisible = false, 不会自动跳出
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

  // ===== 默认编辑器模式偏好 =====
  setDefaultEditMode(mode) {
    if (!['auto', 'markdown', 'plain'].includes(mode)) return;
    store.defaultEditMode = mode;
    try { localStorage.setItem('quickmark-default-mode', mode); } catch {}
  },

  // ===== Data loading =====
  async loadNotes() {
    store.notesLoading = true;
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
    } finally {
      store.notesLoading = false;
    }
  },

  async loadGraphNotes() {
    try {
      const result = await API.getNotes({});
      store.graphNotes = result || [];
    } catch (err) {
      console.error('loadGraphNotes error:', err);
      store.graphNotes = [];
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

  // ===== 三栏宽度调节 =====

  setSidebarWidth(w) {
    store.sidebarWidth = Math.round(w);
    try { localStorage.setItem('quickmark-sidebar-width', String(store.sidebarWidth)); } catch {}
  },

  setListWidth(w) {
    store.listWidth = Math.round(w);
    try { localStorage.setItem('quickmark-list-width', String(store.listWidth)); } catch {}
  },

  // 恢复默认宽度 (双击分隔条时用)
  resetLayoutWidths() {
    store.setSidebarWidth(264);
    store.setListWidth(340);
    store.sidebarCollapsed = false;
    store.noteListCollapsed = false;
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
      // 追加到末尾 (与后端 position = max+1 一致), 新笔记出现在列表下方
      store.notes.push({
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

  openNote(note, options = {}) {
    // 进入新笔记: 把当前编辑笔记推入历史栈 (供 goBackToPreviousNote 回退)
    // 注意: 创建新笔记 / 初次打开不推空栈; goBackToPreviousNote 也要走 pushHistory: false
    // 否则回退会把"当前笔记"又压回去, 栈永远不清
    const { pushHistory = true } = options;
    const prevId = store.editingNote ? store.editingNote.id : null;

    // 切到新笔记前, 把当前编辑的笔记先保存 (fire-and-forget, 不阻塞)
    // 解决"切笔记丢修改"问题: 之前点 NoteCard 直接 openNote(B), 老笔记 A 的最后编辑
    // 在 setEditContent(B.content) 时被覆盖, 且 scheduleAutoSave 的 1s 闭包里 noteId
    // 已经是 B → A 永远没机会被保存 (用户感知"保存失效")
    // 改成这里 fire-and-forget 同步快照保存, 走完后 cancelAutoSave 防止与新笔记 timer 冲突
    if (prevId && prevId !== note.id) {
      // fire-and-forget: async 一定返回 Promise, .catch 兜底防 unhandled rejection
      store._persistCurrentEdit().catch(err => console.warn('切换前保存失败:', err));
      store.cancelAutoSave();
    }

    if (pushHistory && prevId && prevId !== note.id) {
      store.noteHistory.push(prevId);
      // 上限 30 条, 超过丢最早的
      while (store.noteHistory.length > 30) store.noteHistory.shift();
      // 用户主动跳到别的笔记 → 前进栈作废 (同浏览器: 新导航会清掉 forward 历史)
      store.noteForward = [];
    }
    store.editingNote = { ...note };
    store.editTitle = note.title || '';
    store.editPlanData = note.planData ? (typeof note.planData === 'string' ? JSON.parse(note.planData) : note.planData) : null;
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
    // 旧数据迁移: 正文里残留的 <!-- qm-plan --> → 提取到 editPlanData, 从正文清掉
    if (!store.editPlanData && note.content) {
      const oldPlanMatch = note.content.match(/<!--\s*qm-plan:\s*([^]*?)-->/);
      if (oldPlanMatch) {
        const raw = oldPlanMatch[1].trim();
        const plan = {};
        raw.split(',').map(s => s.trim()).forEach(p => {
          const eqIdx = p.indexOf('=');
          if (eqIdx === -1) return;
          const key = p.slice(0, eqIdx).trim();
          const val = p.slice(eqIdx + 1).trim();
          if (key === 'start' || key === 'end') plan[key] = val;
          if (key === 'progress') plan.progress = Math.min(100, Math.max(0, parseInt(val) || 0));
          if (key === 'color') plan.color = /^#[0-9a-f]{6}$/i.test(val) ? val : null;
        });
        if (plan.start && plan.end) {
          store.editPlanData = { start: plan.start, end: plan.end, progress: plan.progress ?? 0, color: plan.color || undefined };
          // 从正文清除旧注释
          store.editContent = store.editContent.replace(/<!--\s*qm-plan:[\s\S]*?-->\s*/g, '').trim();
        }
      }
    }
    store.editCategoryIds = note.category_ids ? [...note.category_ids] : [];
    store.editMode = store.defaultEditMode !== 'auto'
      ? store.defaultEditMode
      : detectContentMode(store.editContent);
  },

  setEditMode(mode) {
    if (mode !== 'plain' && mode !== 'markdown') return;
    if (store.editMode === mode) return;
    store.editMode = mode;
  },

  // 打开一条「可能不在当前笔记列表里」的笔记 (跨分类 / 被搜索条件过滤掉)
  // 会先把分类栏和列表切到它所属分类, 否则编辑器打开了、侧栏列表里却看不到它
  // 用法: 回退上一笔记 / 点击 Wiki 链接跳转 等"跳到任意笔记"的场景
  async openNoteFromElsewhere(note, options = {}) {
    if (!note) return false;
    if (store.notes.some(n => n.id === note.id)) {
      store.openNote(note, options);
      return true;
    }
    const catId = note.category_ids && note.category_ids.length
      ? note.category_ids[0]
      : null;
    store.selectedCategoryId = catId; // 无分类则回到「全部笔记」
    store.searchQuery = '';           // 清掉搜索词, 否则目标可能仍被过滤
    try {
      await store.loadNotes();
    } catch (e) {
      // 列表加载失败不阻断打开笔记, 用传入的对象兜底
    }
    const target = store.notes.find(n => n.id === note.id) || note;
    store.openNote(target, options);
    return true;
  },

  // 回到上一条笔记: 弹出历史栈最顶上一条, 找到后用 openNote 打开
  // 若栈空 → false; 笔记已被删除 (store.notes 找不到) → 调 API.getNote 拉一次再开
  // 覆盖"切了分类后回退到老分类笔记"场景 (loadNotes 只加载当前分类的笔记, 但 DB 还在)
  async goBackToPreviousNote() {
    if (store.noteHistory.length === 0) return false;
    const prevId = store.noteHistory.pop();
    let target = store.notes.find(n => n.id === prevId);
    if (!target) {
      // store.notes 找不到: 先从 API 拉 (可能是跨分类的笔记)
      try {
        target = await API.getNote(prevId);
      } catch (e) {
        store.showToast('上一条笔记已不存在', 'error');
        // 跳过这条, 递归往下找
        if (store.noteHistory.length > 0) {
          return store.goBackToPreviousNote();
        }
        return false;
      }
      if (!target) {
        if (store.noteHistory.length > 0) return store.goBackToPreviousNote();
        return false;
      }
    }
    // 回退时当前笔记要压进"前进栈", 供 goForwardToNextNote 反撤回
    const curId = store.editingNote ? store.editingNote.id : null;
    if (curId && curId !== target.id) {
      store.noteForward.push(curId);
      while (store.noteForward.length > 30) store.noteForward.shift();
    }
    // pushHistory: false - 回退不再把"当前"又压回历史栈, 否则会无限来回
    await store.openNoteFromElsewhere(target, { pushHistory: false });
    return true;
  },

  // 反撤回: 前进到刚才被回退掉的那条笔记 (前进栈)
  async goForwardToNextNote() {
    if (store.noteForward.length === 0) return false;
    const nextId = store.noteForward.pop();
    let target = store.notes.find(n => n.id === nextId);
    if (!target) {
      try {
        target = await API.getNote(nextId);
      } catch (e) {
        if (store.noteForward.length > 0) return store.goForwardToNextNote();
        return false;
      }
      if (!target) {
        if (store.noteForward.length > 0) return store.goForwardToNextNote();
        return false;
      }
    }
    // 前进时当前笔记要压回历史栈, 这样再点"回退"能原路返回
    const curId = store.editingNote ? store.editingNote.id : null;
    if (curId && curId !== target.id) {
      store.noteHistory.push(curId);
      while (store.noteHistory.length > 30) store.noteHistory.shift();
    }
    await store.openNoteFromElsewhere(target, { pushHistory: false });
    return true;
  },

  // 清空导航历史 (登出时调用, 避免下一个用户看到上一个用户的栈)
  clearNoteHistory() {
    store.noteHistory = [];
    store.noteForward = [];
  },

  // 切换笔记前 fire-and-forget 保存当前编辑 (不阻塞 openNote)
  // 与 closeEditor 的差别: 这里不清空 editingNote/editingContent (因为 openNote 会立即覆盖)
  // 含 qm-links 标记序列化, 字段一致
  // 用 async/await 而不是 .then(): await 一个非 Promise 值 (如测试 mock 返回 undefined)
  // 也是合法的, 天然防御, 不会因为 API 返回非 Promise 就崩
  async _persistCurrentEdit() {
    if (!store.editingNote || !store.editingNote.id) return;
    // 关键: 必须在 await 之前快照所有状态
    // 调用方 openNote 是 fire-and-forget, await 返回时 store.editTitle / editCategoryIds
    // 已经被换成"新笔记"的值了, 若此时再读会污染老笔记的本地条目
    const noteId = store.editingNote.id;
    const snapTitle = store.editTitle || '无标题';
    const snapCategoryIds = [...(store.editCategoryIds || [])];
    let content = store.editContent || '';
    const links = [...store.editLinks];
    if (links.length > 0) {
      content = content.replace(/<!--\s*qm-links:[\s\S]*?-->\s*/g, '').trim()
        + '\n<!-- qm-links:' + JSON.stringify(links) + ' -->';
    }
    try {
      await API.updateNote(noteId, {
        title: snapTitle,
        content,
        category_ids: snapCategoryIds
      });
      // 同步本地 store 状态, 防止 loadNotes() 覆盖丢失
      const idx = store.notes.findIndex(n => n.id === noteId);
      if (idx !== -1) {
        const catNames = snapCategoryIds
          .map(cid => store.categories.find(c => c.id === cid)?.name)
          .filter(Boolean);
        store.notes[idx] = {
          ...store.notes[idx],
          title: snapTitle,
          content,
          category_ids: [...snapCategoryIds],
          category_names: catNames
        };
      }
    } catch (err) {
      console.warn('切换前保存老笔记失败:', err);
    }
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
    store.editPlanData = null;
    store.editLinks = [];
    store.editMode = 'markdown';
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
    // 构建内容: 去掉旧链接/计划标记, 追加当前链接
    let content = (store.editContent || '')
      .replace(/<!--\s*qm-links:[\s\S]*?-->\s*/g, '')
      .replace(/<!--\s*qm-plan:[\s\S]*?-->\s*/g, '')
      .trim();
    if (store.editLinks && store.editLinks.length > 0) {
      content += '\n<!-- qm-links:' + JSON.stringify(store.editLinks) + ' -->';
    }
    const data = {
      title: store.editTitle || '无标题',
      content: content,
      category_ids: [...(store.editCategoryIds || [])],
      planData: store.editPlanData || null
    };
    // 快照: await 之后 store.editCategoryIds 可能已被切换笔记改掉
    const snapCategoryIds = [...data.category_ids];
    try {
      const result = await API.updateNote(noteId, data);
      // 用 try-catch 包裹写入操作, 防止 editingNote 已被 closeEditor 置空时抛错
      try {
        if (store.editingNote && store.editingNote.id === noteId) {
          Object.assign(store.editingNote, result, {
            category_ids: snapCategoryIds
          });
        }
        const idx = store.notes.findIndex(n => n.id === noteId);
        if (idx !== -1) {
          const catNames = snapCategoryIds
            .map(cid => store.categories.find(c => c.id === cid)?.name)
            .filter(Boolean);
          store.notes[idx] = {
            ...store.notes[idx],
            title: data.title,
            content: data.content,
            category_ids: [...snapCategoryIds],
            category_names: catNames,
            planData: data.planData
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

  // 拖拽笔记到分类：直接替换笔记的分类
  async moveNoteToCategory(noteId, catId) {
    try {
      await API.updateNote(noteId, { category_ids: [catId] });
      // 更新本地 store 中的笔记数据
      const idx = store.notes.findIndex(n => n.id === noteId);
      if (idx !== -1) {
        const cat = store.categories.find(c => c.id === catId);
        store.notes[idx].category_ids = [catId];
        store.notes[idx].category_names = cat ? [cat.name] : [];
        store.noteListVersion = Date.now();
      }
      store.showToast('分类已变更');
      store.loadCategories();
    } catch (err) {
      console.error('移动笔记失败:', err);
      store.showToast('分类变更失败', 'error');
    }
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
