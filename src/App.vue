<template>
  <div class="flex flex-col h-full">
    <div class="noise-overlay"></div>
    <!-- 启动鉴权中: 显示 loading, 不直接渲染 LoginView 避免页面闪烁 -->
    <div v-if="!authChecked" class="flex-1 flex items-center justify-center"
      style="background: var(--bg-panel);">
      <div class="flex flex-col items-center gap-3" style="color: var(--text-tertiary);">
        <svg class="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"
          style="color: var(--color-accent);">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"
            stroke-opacity="0.2" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" />
        </svg>
        <p class="text-sm">正在加载…</p>
      </div>
    </div>
    <LoginView v-else-if="!loggedIn" :initialError="initialError" @success="onLoginSuccess" />
    <template v-else>
      <AppHeader @logout="onLogout" @openFeedback="feedbackVisible = true" @openFeedbackAdmin="feedbackAdminVisible = true" />
      <!-- 三栏宽度由内联 CSS 变量驱动: Sidebar/NoteList 内部仍用 var(--sidebar-width) 等 -->
      <div class="app-layout flex-1 min-h-0"
        :style="{
          '--sidebar-width': store.sidebarWidth + 'px',
          '--list-width': store.listWidth + 'px'
        }">
        <Sidebar />

        <!-- 分类栏 | 笔记列表 的分隔条 -->
        <LayoutResizer v-show="resizingEnabled()"
          title="拖拽调整分类栏宽度 (双击恢复默认)"
          @start="onSidebarResizeStart"
          @end="onSidebarResizeEnd"
          @resize="resizeSidebar"
          @reset="store.resetLayoutWidths()" />

        <!-- 笔记列表: 桌面始终显示; 手机/平板编辑时隐藏 (编辑全屏, 保证编辑区宽度) -->
        <NoteList v-show="!store.editingNote || !store.isCompact" />

        <!-- 笔记列表 | 编辑器 的分隔条 -->
        <LayoutResizer v-show="resizingEnabled() && (!store.editingNote || !store.isCompact)"
          title="拖拽调整笔记列表宽度 (双击恢复默认)"
          @resize="resizeList"
          @reset="store.resetLayoutWidths()" />

        <!-- 编辑器: 桌面/平板始终显示(空态时占位); 手机仅编辑时显示 -->
        <NoteEditor v-if="store.editingNote" v-show="store.isDesktop || store.isCompact" />
        <div v-else-if="store.isDesktop || store.isTablet"
          class="flex-1 flex flex-col items-center justify-center"
          style="background: var(--bg-panel); color: var(--text-tertiary);">
          <svg class="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style="color: var(--border-default);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <p class="text-sm" style="color: var(--text-tertiary);">从左侧选择一篇笔记,或新建开始记录</p>
        </div>
      </div>

      <CategoryDialog />
      <NewNoteDialog />
      <ShortcutHelp />
      <PreferenceDialog />
      <UserGuide />
      <OnboardingTour />
      <KnowledgeGraph />
            <FeedbackDialog :visible="feedbackVisible" @close="feedbackVisible = false" />
      <FeedbackAdmin :visible="feedbackAdminVisible" @close="feedbackAdminVisible = false" />
      <Toast />
    </template>

    <!-- 拓展功能: 2D 画布 (main-overlay slot, 全屏覆盖) -->
    <ExtensionSlot name="main-overlay" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { store } from '@/store';
import AppHeader from '@/components/AppHeader.vue';
import Sidebar from '@/components/Sidebar.vue';
import NoteList from '@/components/NoteList.vue';
import NoteEditor from '@/components/NoteEditor.vue';
import CategoryDialog from '@/components/CategoryDialog.vue';
import NewNoteDialog from '@/components/NewNoteDialog.vue';
import ShortcutHelp from '@/components/ShortcutHelp.vue';
import PreferenceDialog from '@/components/PreferenceDialog.vue';
import UserGuide from '@/components/UserGuide.vue';
import OnboardingTour from '@/components/OnboardingTour.vue';
import Toast from '@/components/Toast.vue';
import LoginView from '@/components/LoginView.vue';
import FeedbackDialog from '@/components/FeedbackDialog.vue';
import FeedbackAdmin from '@/components/FeedbackAdmin.vue';
import KnowledgeGraph from '@/components/KnowledgeGraph.vue';
import ExtensionSlot from '@/components/ExtensionSlot.vue';
import LayoutResizer from '@/components/LayoutResizer.vue';
import API from '@/api/index.js';
import { initFeatures, resetFeatures } from '@/store/features.js';

const authChecked = ref(false);
const loggedIn = ref(false);
const initialError = ref('');
const feedbackVisible = ref(false);
const feedbackAdminVisible = ref(false);

// ===== 三栏宽度拖拽 (Blender 风格) =====
// 规则与计算在 src/utils/layout.js (纯函数, 有单测), 这里只做状态搬运
import * as layout from '@/utils/layout.js';

let dragPairTotal = 0;     // 拖 gutter1 时: sidebar + list 的总宽 (此消彼长的基准)
let collapsedDrag = 0;     // 收起状态下累计的回拖距离

// 只有桌面/平板才分三栏, 手机端是单栏全屏
function resizingEnabled() {
  return store.isDesktop || store.isTablet;
}

function onSidebarResizeStart() {
  dragPairTotal = (store.sidebarCollapsed ? 0 : store.sidebarWidth)
    + (store.noteListCollapsed ? 0 : store.listWidth);
  collapsedDrag = 0;
}

function resizeSidebar(delta) {
  if (!resizingEnabled()) return;
  const avail = Math.max(0, window.innerWidth - layout.MIN_EDITOR);
  const r = layout.resizeSidebar({
    delta,
    sidebarWidth: store.sidebarWidth,
    listWidth: store.listWidth,
    sidebarCollapsed: store.sidebarCollapsed,
    noteListCollapsed: store.noteListCollapsed,
    pairTotal: dragPairTotal,
    collapsedDrag,
    avail
  });
  store.setSidebarWidth(r.sidebarWidth);
  store.setListWidth(r.listWidth);
  store.sidebarCollapsed = r.sidebarCollapsed;
  store.noteListCollapsed = r.noteListCollapsed;
  collapsedDrag = r.collapsedDrag;
}

function resizeList(delta) {
  if (!resizingEnabled()) return;
  const sidebarW = store.sidebarCollapsed ? 0 : store.sidebarWidth;
  const avail = Math.max(0, window.innerWidth - sidebarW - layout.MIN_EDITOR);
  const r = layout.resizeList({
    delta,
    listWidth: store.listWidth,
    noteListCollapsed: store.noteListCollapsed,
    collapsedDrag,
    avail
  });
  store.setListWidth(r.listWidth);
  store.noteListCollapsed = r.noteListCollapsed;
  collapsedDrag = r.collapsedDrag;
}


onMounted(async () => {
  const user = await API.me();
  // 鉴权检查完毕才解除 loading, 避免页面闪一下登录页
  authChecked.value = true;
  if (user) {
    onLoginSuccess(user);
  }
});

async function onLoginSuccess(user) {
  // user 来自 LoginView (登录或注册) 或 onMounted (refresh 恢复)
  // 如果是 onMounted 拿到的, 这里 user 已有; LoginView 不传
  loggedIn.value = true;
  if (user) {
    store.currentUser = user;
  } else {
    // LoginView 没传 user (登录后), 这里补一次 me 拿全字段
    store.currentUser = await API.me();
  }
  await store.loadAll();
  store.initOnboarding();
  await initFeatures(); // 拉取功能开关状态
}

async function onLogout() {
  try {
    await API.logout();
  } catch (e) {
    // 登出失败也无所谓, 前端清状态即可
    console.warn('logout API failed:', e);
  }
  // 清前端状态
  store.currentUser = null;
  resetFeatures(); // 清空功能开关, 避免下一个用户看到上一个用户的
  store.notes = [];
  store.categories = [];
  store.editingNote = null;
  store.editTitle = '';
  store.editContent = '';
  store.editCategoryIds = [];
  store.searchQuery = '';
  store.selectedCategoryId = null;
  store.clearNoteHistory(); // 清导航历史, 避免下一个用户看到上一个用户的栈
  // 切回登录页
  loggedIn.value = false;
}
</script>
