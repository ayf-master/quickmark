// QuickMark - Vite 入口
// 阶段 7: 启动时不再主动 loadAll (由 App.vue 登录成功后再触发)
// 1. 挂载 Vue 根组件到 #app-root
// 2. 初始化主题 (避免 FOUC)
// 3. 装自检钩子
// 4. 注册全局键盘快捷键 (登录后才生效, 但挂载不报错)
// CSS import: Vite 会走 PostCSS, 把 @tailwind 指令编译成实际 utility
import '@/../css/tailwind.css';
import { createApp } from 'vue';
import { store } from '@/store';
import { installTestHook } from '@/composables/useTestHook';
import App from '@/App.vue';

const app = createApp(App);
app.mount('#app-root');

// 启动副作用: 主题 (loadAll 由 App.vue 登录后触发)
// initOnboarding 在 1.0 改为兼容层: 一次性清除 v0 老 localStorage 标记
// v1 起新用户首次空态提示由 NoteList.vue 自己管理
store.initTheme();
store.initOnboarding();
installTestHook();

document.addEventListener('keydown', globalKeydown);
window.addEventListener('beforeunload', () => {
  document.removeEventListener('keydown', globalKeydown);
});

function globalKeydown(e) {
  // 登录页时不响应全局快捷键
  if (window.location.hash.includes('test') === false && !document.querySelector('header')) return;

  const target = e.target;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;

  // ? 快捷键帮助 (非输入态)
  if (e.key === '?' && !mod && !e.altKey && !isInput) {
    e.preventDefault();
    store.shortcutPanelVisible = !store.shortcutPanelVisible;
    return;
  }

  // Ctrl+Shift+/ 或 Alt+? 打开使用指南 (避免跟 ? 冲突)
  if ((mod && e.shiftKey && e.key === '/') || (e.altKey && e.key === '?' && !mod)) {
    e.preventDefault();
    store.toggleUserGuide();
    return;
  }

  // Ctrl+K 聚焦笔记搜索 (NoteList 顶部)
  if (mod && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    const searchInput = document.querySelector('[data-note-search-input]');
    searchInput?.focus();
    return;
  }
  // Ctrl+Shift+F 聚焦分类搜索 (Sidebar 顶部)
  if (mod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
    const searchInput = document.querySelector('[data-category-search-input]');
    searchInput?.focus();
    return;
  }

  // 编辑器内快捷键
  if (store.editingNote) {
    // Ctrl+S 强制保存
    if (mod && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      store.forceSave();
      return;
    }
    // Ctrl+Shift+P 切换置顶
    if (mod && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault();
      store.togglePin();
      return;
    }
    // Esc 关闭编辑器
    // 注意: 全屏浮层 (图片预览/知识图谱) 打开时 Esc 归浮层, 不能关编辑器 —
    // 否则预览里按 Esc, 事件冒泡到 document 会把整个编辑器一起退掉
    if (e.key === 'Escape' && !store.imagePreviewVisible && !store.knowledgeGraphVisible
      && !store.preferencePanelVisible && !store.shortcutPanelVisible && !store.userGuideVisible
      && !store.newNoteDialogOpen && !store.showNewCategoryDialog && !store.showEditCategoryDialog
      && !store.mobileDrawerOpen) {
      store.closeEditor();
      return;
    }
  }

  // 非输入态快捷键
  if (!isInput) {
    // Alt+N 新建笔记 (v1.1: 改用 Alt+N, 避开浏览器 Ctrl+N 开新窗口的冲突)
    if (e.altKey && !mod && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      store.openNewNoteDialog();
      return;
    }
    // Ctrl+G / Cmd+G 打开知识图谱
    if (mod && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      if (store.notes.length > 0) store.knowledgeGraphVisible = true;
      return;
    }
  }

  // ESC 关闭浮层 (优先级: 面板 > 抽屉 > 弹窗)
  if (e.key === 'Escape') {
    if (store.preferencePanelVisible) {
      store.preferencePanelVisible = false;
      return;
    }
    if (store.shortcutPanelVisible) {
      store.shortcutPanelVisible = false;
      return;
    }
    if (store.userGuideVisible) {
      store.userGuideVisible = false;
      return;
    }
    if (store.mobileDrawerOpen) {
      store.mobileDrawerOpen = false;
      return;
    }
    if (store.newNoteDialogOpen) {
      store.newNoteDialogOpen = false;
      return;
    }
    if (store.showNewCategoryDialog || store.showEditCategoryDialog) {
      store.cancelCategoryDialog();
      return;
    }
  }
}
