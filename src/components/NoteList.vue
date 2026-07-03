<template>
  <div class="notelist-container" :style="containerStyle">
  <section class="flex flex-col h-full"
    style="overflow: hidden; width: 100%;"
    role="region"
    aria-label="笔记列表"
      data-tour="note-list">
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
        <button v-if="store.isDesktop"
          class="btn btn-icon-sm btn-ghost flex-shrink-0"
          @click="store.noteListCollapsed = !store.noteListCollapsed"
          :title="store.noteListCollapsed ? '展开列表' : '折叠列表'">
          <svg v-if="!store.noteListCollapsed" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <!-- 笔记搜索 (模糊匹配标题+内容, 桌面端显示) -->
      <div v-if="store.isDesktop" class="relative mt-3">
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
        <div v-for="note in store.filteredNotes"
          :key="note.id"
          draggable="true"
          @dragstart="onNoteDragStart($event, note.id)"
          @dragover.prevent="onNoteDragOver($event, note.id)"
          @drop.prevent="onNoteDrop($event, note.id)"
          @dragend="onNoteDragEnd"
          :class="{ 'note-dragging': dragNoteId === note.id, 'note-drop-here': dragOverNoteId === note.id }">
          <NoteCard
            :note="note"
            :is-selected="store.editingNote && store.editingNote.id === note.id"
            @select="store.openNote(note)"
            @delete="store.deleteNoteFromList(note)" />
        </div>
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
  <!-- 展开按钮 (贴在右侧边缘) -->
  <button v-if="store.isDesktop && store.noteListCollapsed"
    class="notelist-expand-btn"
    @click="store.noteListCollapsed = false"
    title="展开列表">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
    </svg>
  </button>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { store } from '@/store';
import API from '@/api/index.js';
import NoteCard from '@/components/NoteCard.vue';

const containerStyle = computed(() => {
  if (store.isDesktop) {
    const collapsed = store.noteListCollapsed;
    return {
      width: collapsed ? '0px' : 'var(--list-width)',
      flexShrink: '0',
      position: 'relative',
      overflow: 'visible',
      transition: 'width 0.2s ease',
      borderRight: '1px solid var(--border-default)',
      background: 'var(--bg-panel)'
    };
  }
  return {
    flex: '1',
    background: 'var(--bg-panel)',
    position: 'relative'
  };
});

// ===== 拖拽排序 =====
const dragNoteId = ref(null);
const dragOverNoteId = ref(null);

function onNoteDragStart(e, id) {
  dragNoteId.value = id;
  e.dataTransfer.effectAllowed = 'move';
}

function onNoteDragOver(e, id) {
  if (dragNoteId.value && dragNoteId.value !== id) {
    dragOverNoteId.value = id;
  }
}

async function onNoteDrop(e, id) {
  const fromId = dragNoteId.value;
  const toId = id;
  dragOverNoteId.value = null;
  if (!fromId || fromId === toId) return;
  // 从 store 取出笔记列表，重新排序
  const sorted = store.notes.slice(); // 浅拷贝
  const fromIdx = sorted.findIndex(n => n.id === fromId);
  const toIdx = sorted.findIndex(n => n.id === toId);
  if (fromIdx < 0 || toIdx < 0) return;
  const [moved] = sorted.splice(fromIdx, 1);
  const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
  sorted.splice(insertAt, 0, moved);
  // 更新 position 并写回 store
  sorted.forEach((n, i) => { n.position = i; });
  store.notes = sorted;
  store.noteListVersion = Date.now(); // 触发 filteredNotes 重算
  // 异步保存到后端
  try {
    await API.reorderNotes(sorted.map(n => n.id));
  } catch (err) {
    console.warn('排序保存失败:', err);
  }
}

function onNoteDragEnd() {
  dragNoteId.value = null;
  dragOverNoteId.value = null;
}

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
.notelist-expand-btn {
  position: absolute;
  right: -20px;
  top: 10px;
  z-index: 35;
  width: 20px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-left: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 0;
  transition: color 0.12s, background 0.12s;
}
.notelist-expand-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}
.note-dragging {
  opacity: 0.4;
  transition: opacity 0.15s;
}
.note-drop-here {
  position: relative;
  transform: translateY(6px);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.note-drop-here::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: -8px;
  height: 3px;
  background: var(--color-primary);
  border-radius: 2px;
  opacity: 0.6;
  animation: dropPulse 0.8s ease-in-out infinite alternate;
}
@keyframes dropPulse {
  from { opacity: 0.3; transform: scaleY(0.8); }
  to { opacity: 0.7; transform: scaleY(1); }
}
</style>
