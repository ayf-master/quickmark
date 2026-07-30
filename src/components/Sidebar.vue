<template>
  <!-- 移动端遮罩 -->
  <div v-if="store.isCompact"
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
    :aria-modal="store.isCompact ? 'true' : 'false'">
    <!-- 顶部工具栏: 折叠/展开按钮 (避免与 AppHeader 顶部 logo 重复) -->
    <div v-if="store.isDesktop" class="px-3 py-3 flex-shrink-0 flex justify-end"
      style="border-bottom: 1px solid var(--border-default);">
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
    <div class="px-4 flex-shrink-0" :class="store.isCompact ? 'py-4' : 'py-3'"
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
    <nav class="flex-1 panel-scroll px-3 pb-4" aria-label="分类" data-tour="sidebar">
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
      <button @click="store.knowledgeGraphVisible = true"
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
        <span class="text-xs ml-auto" style="color: var(--text-tertiary);">⌘G</span>
      </button>
    </div>

    <!-- 拓展功能插槽 (预留) -->
    <ExtensionSlot name="sidebar-bottom" />
  </aside>
</template>

<script setup>
import { computed, watch, nextTick } from 'vue';
import { store } from '@/store';
import CategoryTreeNode from '@/components/CategoryTreeNode.vue';
import ExtensionSlot from '@/components/ExtensionSlot.vue';

const sidebarClass = computed(() => ({
  'sidebar-desktop': store.isDesktop,
  'sidebar-drawer': store.isCompact,
  'drawer-open': store.isCompact && store.mobileDrawerOpen
}));

const sidebarStyle = computed(() => {
  if (store.isDesktop) {
    // 每展开一级, 侧边栏整体加宽, 让右侧 (笔记列表/编辑器) 一起右移
    // 步进 18px: 够放下名字+计数+"+"号, 不会过宽
    const step = 18;
    const extra = store.maxExpandedDepth * step;
    const baseWidth = 'var(--sidebar-width)';
    const finalWidth = store.sidebarCollapsed
      ? '0px'
      : `calc(${baseWidth} + ${extra}px)`;
    return {
      width: finalWidth,
      flexShrink: '0',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-default)',
      overflow: 'hidden',
      transition: 'width 0.2s ease'
    };
  }
  return {
    position: 'fixed',
    top: '0',
    left: '0',
    bottom: '0',
    width: 'var(--sidebar-width)',
    maxWidth: '85vw',
    zIndex: '51',
    background: 'var(--bg-panel)',
    boxShadow: 'var(--shadow-xl)',
    transform: store.mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)'
  };
});

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

</style>
