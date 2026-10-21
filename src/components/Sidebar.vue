<template>
  <!-- 手机遮罩 (平板/桌面侧栏常显, 不需要遮罩) -->
  <div v-if="store.isMobile"
    class="drawer-overlay"
    :class="{ open: store.mobileDrawerOpen }"
    @click="store.mobileDrawerOpen = false"
    aria-hidden="true"></div>

  <!-- 侧边栏本体 -->
  <aside
    class="drawer-panel flex flex-col h-full"
    :class="sidebarClass"
    :style="sidebarStyle"
    role="navigation"
    aria-label="侧边导航"
    :aria-modal="store.isMobile ? 'true' : 'false'">
    <!-- 顶部栏目标题头: 与笔记列表/编辑器的头部同高 (h-14), 三栏视觉对齐 -->
    <div v-if="store.isDesktop || store.isTablet" class="h-14 flex-shrink-0 flex items-center justify-between px-5"
      style="border-bottom: 1px solid var(--border-default);">
      <h2 class="text-lg font-semibold" style="color: var(--text-primary);">分类</h2>
      <button
        class="btn btn-icon-sm btn-ghost"
        @click="store.sidebarCollapsed = !store.sidebarCollapsed"
        :aria-label="store.sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
        :title="store.sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'">
        <svg v-if="!store.sidebarCollapsed" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

    <!-- 搜索分类 (桌面+移动端) -->
    <div class="px-4 flex-shrink-0" :class="store.isMobile ? 'py-4' : 'py-3'"
      style="border-bottom: 1px solid var(--border-default);">
      <div class="relative">
        <input type="text"
          v-model="store.categorySearchQuery"
          data-category-search-input
          placeholder="搜索分类..."
          class="input pl-9"
          aria-label="搜索分类" />
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style="color: var(--text-tertiary);">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
    </div>

    <!-- 全部笔记 (只展示) -->
    <div class="px-3 pt-4 flex-shrink-0">
      <button
        @click="store.selectAllNotes()"
        class="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all"
        :class="!store.selectedCategoryId ? 'cat-row-selected' : ''"
        :style="!store.selectedCategoryId ? activeItemStyle : idleItemStyle">
        <span class="flex items-center gap-2.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          全部笔记
        </span>
        <span class="text-xs flex-shrink-0" style="color: var(--text-tertiary);" v-text="store.allNotesCount"></span>
      </button>
    </div>

      <!-- 分类列表 (树形) -->
      <!-- 整个侧栏都是笔记拖放的放置区: 落在行间距/内边距空隙时, 由 onCategoryListDrop 取最近分类行 -->
      <nav class="flex-1 panel-scroll px-3 pb-4"
        aria-label="分类" data-tour="sidebar"
        @dragover="onCategoryListDragOver"
        @drop="onCategoryListDrop">
      <div class="flex items-center justify-between px-2 mb-2 mt-3">
        <h2 class="text-xs font-semibold uppercase tracking-wider"
          style="color: var(--text-tertiary);">分类</h2>
        <button class="btn btn-icon-sm btn-ghost"
          @click="createTopCategory"
          aria-label="新建顶级分类"
          title="新建分类">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      </div>

      <div v-if="store.filteredCategoryTree.length === 0 && store.categorySearchQuery"
        class="text-center py-6 text-xs"
        style="color: var(--text-tertiary);">
        没有匹配的分类
      </div>
      <div v-else-if="store.filteredCategoryTree.length === 0"
        class="text-center py-6 text-xs"
        style="color: var(--text-tertiary);">
        暂无分类,点击右上 ＋ 新建
      </div>

      <CategoryTreeNode
        v-for="root in store.filteredCategoryTree"
        :key="root.id"
        :node="root"
        @select="selectCategory"
        @create-child="createChildCategory"
        @edit="store.editCategory"
        @delete="store.deleteCategory"
        @toggle-expand="store.toggleCategoryExpanded" />
    </nav>

    <!-- 底部: 知识图谱入口 -->
    <div class="flex-shrink-0 px-3 pb-3" style="border-top: 1px solid var(--border-default);">
      <button @click="store.graphFocusNoteId = null; store.knowledgeGraphVisible = true"
        class="w-full flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-lg text-sm transition-all"
        style="color: var(--text-secondary);"
        @mouseenter="$el.style.background='var(--bg-hover)'"
        @mouseleave="$el.style.background='transparent'">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="8" cy="6" r="2" stroke-width="1.8"/>
          <circle cx="16" cy="12" r="2" stroke-width="1.8"/>
          <circle cx="10" cy="18" r="2" stroke-width="1.8"/>
          <line x1="10" y1="7" x2="14" y2="11" stroke-width="1.5"/>
          <line x1="14" y1="13" x2="11" y2="17" stroke-width="1.5"/>
        </svg>
        知识图谱
        <span v-if="store.isDesktop" class="text-xs ml-auto" style="color: var(--text-tertiary);">⌘G</span>
      </button>
    </div>

    <!-- 拓展功能插槽 (预留) -->
    <ExtensionSlot name="sidebar-bottom" />

    <!-- 手机抽屉宽度拖拽把手: 固定在抽屉右缘, 拖动调宽 (双击恢复默认) -->
    <div v-if="store.isMobile && store.mobileDrawerOpen"
      class="drawer-resizer" :class="{ active: resizingDrawer }"
      :style="{ left: store.mobileDrawerWidth + 'px' }"
      title="拖动调整分类栏宽度 (双击恢复默认)"
      @pointerdown="onDrawerResizeStart"
      @dblclick="store.setMobileDrawerWidth(264)">
      <span class="drawer-resizer-grip"></span>
    </div>
  </aside>
</template>

<script setup>
import { computed, watch, nextTick, ref } from 'vue';
import { store } from '@/store';
import CategoryTreeNode from '@/components/CategoryTreeNode.vue';
import ExtensionSlot from '@/components/ExtensionSlot.vue';

const sidebarClass = computed(() => ({
  'sidebar-desktop': store.isDesktop || store.isTablet,
  'sidebar-drawer': store.isMobile,
  'drawer-open': store.isMobile && store.mobileDrawerOpen
}));

const sidebarStyle = computed(() => {
  if (store.isDesktop || store.isTablet) {
    // 每展开一级, 侧边栏整体加宽, 让右侧 (笔记列表/编辑器) 一起右移
    // 步进: 桌面 18px, 平板 14px (平板空间更紧)
    const step = store.isTablet ? 14 : 18;
    const extra = store.maxExpandedDepth * step;
    // 平板也走变量驱动宽度, 保证分隔条拖拽生效 (宽度由 App.vue/store 提供)
    const finalWidth = store.sidebarCollapsed
      ? '0px'
      : `calc(var(--sidebar-width) + ${extra}px)`;
    return {
      width: finalWidth,
      flexShrink: '0',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-default)',
      overflow: 'hidden',
      transition: 'width 0.2s ease'
    };
  }
  // 手机抽屉: 宽度可拖拽调节 (抽屉右缘把手), 不做 collapse
  return {
    position: 'fixed',
    top: '0',
    left: '0',
    bottom: '0',
    width: store.mobileDrawerWidth + 'px',
    maxWidth: '90vw',
    zIndex: '51',
    background: 'var(--bg-panel)',
    boxShadow: 'var(--shadow-xl)',
    transform: store.mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)'
  };
});

// ===== 手机抽屉宽度拖拽 (右缘把手) =====
const resizingDrawer = ref(false);

function onDrawerResizeStart(e) {
  if (e.button != null && e.button !== 0) return;
  e.preventDefault();
  resizingDrawer.value = true;
  const startX = e.clientX;
  const startW = store.mobileDrawerWidth;
  const onMove = (ev) => store.setMobileDrawerWidth(startW + (ev.clientX - startX));
  const onUp = () => {
    resizingDrawer.value = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

const activeItemStyle = {
  backgroundColor: 'var(--bg-active)',
  color: 'var(--color-primary)',
  fontWeight: '600'
};
const idleItemStyle = {
  color: 'var(--text-secondary)'
};

function selectCategory(node) {
  store.selectCategory(node.id);
}

// ===== 笔记拖放到侧栏: 让整个分类列表区域都成为有效放置目标 =====
function onCategoryListDragOver(e) {
  // 仅当拖的是笔记时阻止默认行为, 允许在侧栏任意位置 (含行间距/内边距) 放置
  if (e.dataTransfer && e.dataTransfer.types &&
      e.dataTransfer.types.includes('application/x-quickmark-note')) {
    e.preventDefault();
  }
}

async function onCategoryListDrop(e) {
  const noteId = e.dataTransfer && e.dataTransfer.getData('application/x-quickmark-note');
  if (!noteId) return; // 不是笔记拖放 (分类重排交给 CategoryTreeNode 处理)
  e.preventDefault();
  // 优先用光标下的分类行; 落在空隙则取垂直最近的分类行 (覆盖行间距/内边距落点)
  let row = e.target.closest && e.target.closest('.category-row');
  if (!row) {
    const y = e.clientY;
    let best = null;
    let bestDist = Infinity;
    for (const r of document.querySelectorAll('.category-row')) {
      const rect = r.getBoundingClientRect();
      const dist = Math.abs(y - (rect.top + rect.height / 2));
      if (dist < bestDist) { bestDist = dist; best = r; }
    }
    row = best;
  }
  if (!row) return;
  const catId = Number(row.dataset.catId);
  if (!catId) return;
  e.stopPropagation(); // 与行内 onDrop 二选一, 避免重复处理
  await store.moveNoteToCategory(Number(noteId), catId);
}
function createTopCategory() {
  store.categoryForm = { name: '', color: '#5B8DEF', parent_id: null };
  store.editingCategoryId = null;
  store.showNewCategoryDialog = true;
}
function createChildCategory(parentId) {
  // 自动展开父级以便用户看到
  if (!store.isCategoryExpanded(parentId)) store.toggleCategoryExpanded(parentId);
  store.categoryForm = { name: '', color: '#5B8DEF', parent_id: parentId };
  store.editingCategoryId = null;
  store.showNewCategoryDialog = true;
}

// ===== Focus trap =====
let previousFocus = null;
function handleDrawerKeydown(e) {
  if (e.key === 'Escape') {
    store.mobileDrawerOpen = false;
    return;
  }
  if (e.key !== 'Tab') return;
  const panel = document.querySelector('.sidebar-drawer');
  if (!panel) return;
  const focusable = [...panel.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.disabled && el.offsetParent !== null);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

watch(() => store.mobileDrawerOpen, (open) => {
  if (open) {
    previousFocus = document.activeElement;
    document.addEventListener('keydown', handleDrawerKeydown);
    nextTick(() => {
      const panel = document.querySelector('.sidebar-drawer');
      const first = panel?.querySelector('button, input');
      first?.focus();
    });
  } else {
    document.removeEventListener('keydown', handleDrawerKeydown);
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
      previousFocus = null;
    }
  }
});
</script>

<style scoped>
/* "全部笔记" 选中态: 浅蓝高亮, 样式与 CategoryTreeNode 的 .is-selected 保持一致 */
.cat-row-selected {
  background-color: var(--bg-active) !important;
  color: var(--color-primary) !important;
  font-weight: 600;
}
.rotate-90 {
  transform: rotate(90deg);
}

/* ===== 手机抽屉宽度拖拽把手 ===== */
.drawer-resizer {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 16px;
  margin-left: -8px;
  z-index: 60; /* 高于抽屉本体(z 51) */
  cursor: col-resize;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.drawer-resizer-grip {
  width: 4px;
  height: 44px;
  border-radius: 3px;
  background: var(--color-primary);
  opacity: 0.55;
  transition: opacity .15s;
}
.drawer-resizer:hover .drawer-resizer-grip,
.drawer-resizer.active .drawer-resizer-grip { opacity: 1; height: 64px; }
</style>
