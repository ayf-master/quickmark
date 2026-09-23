<template>
  <Teleport to="body">
    <div class="mobile-cat-page" ref="pageRef" tabindex="-1"
      @keydown.esc="close"
      role="dialog" aria-modal="true" aria-label="分类">
      <!-- 顶栏 -->
      <header class="mcp-header">
        <button class="btn btn-icon btn-ghost" @click="close"
          aria-label="返回" title="返回">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 class="mcp-title">分类</h2>
        <button class="btn btn-icon btn-ghost" @click="createTopCategory"
          aria-label="新建分类" title="新建分类">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      </header>

      <!-- 搜索分类 -->
      <div class="mcp-search">
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

      <div class="mcp-scroll panel-scroll">
        <!-- 全部笔记 -->
        <button @click="store.selectAllNotes()"
          class="mcp-row"
          :style="!store.selectedCategoryId ? activeItemStyle : idleItemStyle">
          <span class="flex items-center gap-2.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
            全部笔记
          </span>
          <span class="text-xs" style="color: var(--text-tertiary);" v-text="store.allNotesCount"></span>
        </button>

        <div class="flex items-center justify-between px-2 mb-2 mt-4">
          <h3 class="text-xs font-semibold uppercase tracking-wider"
            style="color: var(--text-tertiary);">我的分类</h3>
        </div>

        <div v-if="store.filteredCategoryTree.length === 0 && store.categorySearchQuery"
          class="text-center py-6 text-xs" style="color: var(--text-tertiary);">
          没有匹配的分类
        </div>
        <div v-else-if="store.filteredCategoryTree.length === 0"
          class="text-center py-6 text-xs" style="color: var(--text-tertiary);">
          暂无分类, 点击右上 ＋ 新建
        </div>

        <!-- 分类树: 名字完整显示(换行不截断), 不再需要长按看全名 -->
        <div class="cat-page-tree">
          <CategoryTreeNode
            v-for="root in store.filteredCategoryTree"
            :key="root.id"
            :node="root"
            @select="onSelect"
            @create-child="createChildCategory"
            @edit="onEdit"
            @delete="onDelete"
            @toggle-expand="store.toggleCategoryExpanded" />
        </div>

        <!-- 底部: 知识图谱入口 -->
        <button @click="openGraph"
          class="mcp-row mt-4"
          style="color: var(--text-secondary);">
          <span class="flex items-center gap-2.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="8" cy="6" r="2" stroke-width="1.8"/>
              <circle cx="16" cy="12" r="2" stroke-width="1.8"/>
              <circle cx="10" cy="18" r="2" stroke-width="1.8"/>
              <line x1="10" y1="7" x2="14" y2="11" stroke-width="1.5"/>
              <line x1="14" y1="13" x2="11" y2="17" stroke-width="1.5"/>
            </svg>
            知识图谱
          </span>
        </button>

        <p class="mcp-hint">提示: 长按分类行可拖动调整顺序</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { store } from '@/store';
import CategoryTreeNode from '@/components/CategoryTreeNode.vue';

const pageRef = ref(null);

const activeItemStyle = {
  backgroundColor: 'var(--bg-active)',
  color: 'var(--color-primary)',
  fontWeight: '600'
};
const idleItemStyle = {
  color: 'var(--text-secondary)'
};

function close() {
  store.mobileCategoryPageOpen = false;
}

// 选中分类: store.selectCategory 已顺带关闭本页
function onSelect(node) {
  store.selectCategory(node.id);
}

function onEdit(node) {
  close();
  store.editCategory(node);
}

function onDelete(node) {
  close();
  store.deleteCategory(node);
}

function createTopCategory() {
  close();
  store.categoryForm = { name: '', color: '#5B8DEF', parent_id: null };
  store.editingCategoryId = null;
  store.showNewCategoryDialog = true;
}

function createChildCategory(parentId) {
  close();
  if (!store.isCategoryExpanded(parentId)) store.toggleCategoryExpanded(parentId);
  store.categoryForm = { name: '', color: '#5B8DEF', parent_id: parentId };
  store.editingCategoryId = null;
  store.showNewCategoryDialog = true;
}

function openGraph() {
  close();
  store.graphFocusNoteId = null;
  store.knowledgeGraphVisible = true;
}

onMounted(() => {
  pageRef.value?.focus();
});
</script>

<style scoped>
.mobile-cat-page {
  position: fixed;
  inset: 0;
  z-index: 60; /* 高于内容, 低于弹窗类 modal */
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  outline: none;
}
.mcp-header {
  flex-shrink: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: 1px solid var(--border-default);
}
.mcp-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}
.mcp-search {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-default);
}
.mcp-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 12px 32px;
}
.mcp-row {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: 0;
  margin-bottom: 4px;
}
.mcp-row:active { background: var(--bg-hover); }
.mcp-hint {
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 关键: 分类名在手机页里完整显示, 换行而非省略 */
.cat-page-tree :deep(.category-row) {
  overflow: visible;
  padding-top: 10px;
  padding-bottom: 10px;
}
.cat-page-tree :deep(.truncate) {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  line-height: 1.4;
}
</style>
