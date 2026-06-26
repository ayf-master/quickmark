<template>
  <section class="flex flex-col h-full relative"
    :style="panelStyle"
    role="region"
    aria-label="笔记列表">
    <!-- Header: 搜索 + 标题 + 收藏过滤 -->
    <header class="px-6 py-4 flex-shrink-0"
      style="border-bottom: 1px solid var(--border-default);">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h2 class="text-lg font-semibold truncate"
            style="color: var(--text-primary);"
            v-text="store.listTitle"></h2>
          <p class="text-xs mt-0.5" style="color: var(--text-tertiary);">
            {{ (Array.isArray(store.filteredNotes) ? store.filteredNotes.length : 0) }} 条笔记
          </p>
        </div>
        <button
          class="btn btn-icon btn-ghost"
          :class="{ 'is-active': store.showPinnedOnly }"
          :title="store.showPinnedOnly ? '显示全部' : '仅显示收藏'"
          :aria-pressed="store.showPinnedOnly"
          aria-label="仅显示收藏笔记"
          @click="store.togglePinnedFilter()">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
            :style="{ color: store.showPinnedOnly ? 'var(--color-accent)' : 'currentColor' }">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
        </button>
      </div>
      <!-- 笔记搜索 (模糊匹配标题+内容) -->
      <div class="relative mt-3">
        <input type="text"
          v-model="store.searchQuery"
          @input="store.onSearchInput()"
          data-note-search-input
          placeholder="搜索笔记标题或内容..."
          class="input pl-9"
          aria-label="搜索笔记" />
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style="color: var(--text-tertiary);">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <button v-if="store.searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-icon-sm btn-ghost"
          @click="store.searchQuery = ''; store.onSearchInput()"
          aria-label="清空搜索"
          title="清空">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- List / Empty -->
    <div class="flex-1 panel-scroll px-4 py-4">
      <template v-if="Array.isArray(store.filteredNotes) && store.filteredNotes.length > 0">
        <NoteCard
          v-for="note in store.filteredNotes"
          :key="note.id"
          :note="note"
          :is-selected="store.editingNote && store.editingNote.id === note.id"
          @select="store.openNote(note)"
          @delete="store.deleteNoteFromList(note)" />
        <div class="h-4"></div>
      </template>
      <template v-else>
        <div class="flex flex-col items-center justify-center text-center px-6"
          style="height: 70%;">
          <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style="color: var(--text-disabled);">
            <path v-if="store.showPinnedOnly" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="text-sm mb-1" style="color: var(--text-secondary);"
            v-text="emptyText"></p>
          <p v-if="!store.searchQuery && !store.showPinnedOnly" class="text-xs mb-4"
            style="color: var(--text-tertiary);">
            按 Alt + N 新建第一篇笔记 (需选分类)
          </p>
          <button v-if="!store.searchQuery && !store.showPinnedOnly"
            class="btn btn-primary btn-sm"
            @click="store.openNewNoteDialog()">
            新建笔记
          </button>
        </div>
      </template>
    </div>

    <!-- 新用户空态提示: 引导去看使用指南, 点开后写 localStorage 永久不再提示 -->
    <div v-if="showEmptyHint"
      class="absolute left-4 right-4 bottom-4 flex items-center gap-3 p-3 rounded-lg shadow-md"
      style="background: var(--bg-elevated); border: 1px solid var(--border-default);"
      role="status">
      <div class="flex-1 min-w-0 text-sm" style="color: var(--text-secondary);">
        不确定从哪开始？打开
        <button class="font-medium underline"
          style="color: var(--color-accent);"
          @click="openGuide" v-text="'使用指南'"></button>
        看 5 分钟教程
      </div>
      <button class="btn btn-icon-sm btn-ghost" aria-label="关闭" @click="dismissHint">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { store } from '@/store';
import NoteCard from '@/components/NoteCard.vue';

const panelStyle = computed(() => {
  // 桌面端固定宽度, 平板/移动端占满
  if (store.isDesktop) {
    return {
      width: 'var(--list-width)',
      flexShrink: '0',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-default)'
    };
  }
  return {
    flex: '1',
    background: 'var(--bg-panel)'
  };
});

// 提示: 数据空 + 没永久关闭 + 当次会话没关过 → 显示
const hintDismissedThisSession = ref(false);
const HINT_KEY = 'quickmark-empty-hint-dismissed';

function readHintDismissed() {
  try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return false; }
}
function writeHintDismissed() {
  try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
}

// 空态文案: 根据当前过滤模式显示不同提示
// 收藏模式: 还没有收藏的笔记 (不放"新建笔记"按钮)
// 搜索模式: 没有找到匹配的笔记
// 默认: 还没有笔记
const emptyText = computed(() => {
  if (store.showPinnedOnly) return '还没有收藏的笔记';
  if (store.searchQuery) return '没有找到匹配的笔记';
  return '还没有笔记';
});

const showEmptyHint = computed(() => {
  if (hintDismissedThisSession.value) return false;
  if (readHintDismissed()) return false;
  // 数据非空 (有笔记或分类) → 隐
  if (store.notes.length > 0 || store.categories.length > 0) return false;
  // 用户当前在搜索/收藏模式 → 隐 (避免干扰, 收藏模式有自己的空态)
  if (store.searchQuery) return false;
  if (store.showPinnedOnly) return false;
  return true;
});

function openGuide() {
  hintDismissedThisSession.value = true;
  writeHintDismissed();
  store.openUserGuide();
}

function dismissHint() {
  hintDismissedThisSession.value = true;
  writeHintDismissed();
}

onMounted(() => {
  // 启动时不弹, 留到首次进入空态时自然出现
  // 配合 store.loadAll() 后 watch notes/categories 自动隐藏
});
</script>

<style scoped>
.btn-ghost.is-active {
  background: var(--color-accent-subtle) !important;
  color: var(--color-accent) !important;
}
</style>
