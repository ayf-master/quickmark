<template>
  <div class="notelist-container" :style="containerStyle">
  <section class="flex flex-col h-full"
    style="overflow: hidden; width: 100%;"
    role="region"
    aria-label="笔记列表"
      data-tour="note-list">
    <!-- Header: 搜索 + 标题 + 收藏过滤 -->
    <header class="h-14 px-5 flex-shrink-0 flex items-center justify-between gap-3"
      style="border-bottom: 1px solid var(--border-default);">
      <!-- 与侧栏/编辑器头部同高 (h-14), 标题 + 条数 + 操作按钮单行对齐 -->
      <div class="min-w-0 flex items-baseline gap-2">
        <h2 class="text-lg font-semibold truncate"
          style="color: var(--text-primary);"
          v-text="store.listTitle"></h2>
        <span class="text-xs flex-shrink-0" style="color: var(--text-tertiary);">
          {{ (Array.isArray(store.filteredNotes) ? store.filteredNotes.length : 0) }} 条
        </span>
      </div>
        <button
          class="btn btn-icon-sm btn-ghost"
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
        <button v-if="store.isDesktop || store.isTablet"
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
    </header>

    <!-- 笔记搜索 (模糊匹配标题+内容, 桌面/平板显示; 手机在顶部栏搜索) -->
    <!-- 外层只管间距/边框, 内层 relative 承载 input 和绝对定位的图标 (与侧栏搜索框同构) -->
    <div v-if="store.isDesktop || store.isTablet" class="px-5 py-3 flex-shrink-0"
      style="border-bottom: 1px solid var(--border-default);">
      <div class="relative">
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
    </div>

    <!-- List / Empty / Skeleton -->
    <div class="flex-1 panel-scroll px-4 py-4">
      <!-- 骨架屏 (加载中) -->
      <template v-if="store.notesLoading">
        <div v-for="i in 5" :key="'sk' + i"
          class="p-4 mb-[10px] rounded-lg"
          style="background: var(--bg-panel);">
          <div class="skeleton h-5 w-3/4 mb-3"></div>
          <div class="skeleton h-4 w-full mb-2"></div>
          <div class="skeleton h-4 w-2/3 mb-3"></div>
          <div class="flex items-center gap-2">
            <div class="skeleton h-3 w-16"></div>
            <div class="skeleton h-5 w-12 rounded-full"></div>
          </div>
        </div>
      </template>
      <template v-else-if="Array.isArray(store.filteredNotes) && store.filteredNotes.length > 0">
        <div v-for="(note, idx) in store.filteredNotes"
          :key="note.id"
          :data-id="note.id"
          ref="noteEls"
          :draggable="!store.isMobile"
          @dragstart="onNoteDragStart($event, note.id)"
          @dragenter.prevent="onNoteDragOver($event, note.id)"
          @dragover.prevent="onNoteDragOver($event, note.id)"
          @drop.prevent="onNoteDrop($event, note.id)"
          @dragend="onNoteDragEnd"
          @touchstart="onNoteTouchStart"
          @touchmove="onNoteTouchMove"
          @touchend="onNoteTouchEnd"
          @touchcancel="onNoteTouchCancel"
          @contextmenu.prevent
          :class="['fade-in-up', { 'note-dragging': dragNoteId === note.id, 'note-drop-here': dragOverNoteId === note.id }]"
          :style="{ animationDelay: idx * 0.04 + 's', position: 'relative' }">
          <NoteCard
            :note="note"
            :is-selected="store.editingNote && store.editingNote.id === note.id"
            :is-due="features.dueNoteIds.includes(note.id)"
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
          <p v-if="!store.searchQuery && !store.showPinnedOnly && store.isDesktop" class="text-xs mb-4"
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
  <button v-if="(store.isDesktop || store.isTablet) && store.noteListCollapsed"
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
import { computed, ref, onMounted, watch } from 'vue';
import { store } from '@/store';
import { features, refreshDueNotes } from '@/store/features.js';
import API from '@/api/index.js';
import NoteCard from '@/components/NoteCard.vue';

// 间隔重复: 到期高亮使用 features.dueNoteIds (共享状态, 标记已复习后即时更新)

watch(() => features.spacedRepetition, async (val) => {
  if (val) {
    // 先立即刷新 (卡片已存在时快速显示高亮)
    refreshDueNotes();
    // 再尝试注册新卡片 (幂等, 已有则跳过)
    try { await API.enrollReview(); } catch (e) { /* 注册失败不影响已有卡片 */ }
    // 800ms 后保底重刷, 确保 enroll 后的新卡片也纳入
    setTimeout(() => refreshDueNotes(), 800);
  } else {
    features.dueNoteIds = [];
    features.dueCardMap = {};
    features.dueCount = 0;
  }
});

const containerStyle = computed(() => {
  if (store.isDesktop || store.isTablet) {
    const collapsed = store.noteListCollapsed;
    // 平板与桌面统一走变量驱动宽度, 分隔条拖拽才生效
    const width = 'var(--list-width)';
    return {
      width: collapsed ? '0px' : width,
      flexShrink: '0',
      // min-width: 0 让宽度不被长内容撑开 (否则卡片右侧会溢出屏幕)
      minWidth: '0',
      position: 'relative',
      overflow: 'visible',
      transition: 'width 0.2s ease',
      borderRight: '1px solid var(--border-default)',
      background: 'var(--bg-panel)'
    };
  }
  return {
    flex: '1',
    minWidth: '0',
    background: 'var(--bg-panel)',
    position: 'relative'
  };
});

// ===== 拖拽排序 =====
const dragNoteId = ref(null);
const dragOverNoteId = ref(null);
const noteEls = ref([]);

async function onNoteDragStart(e, id) {
  dragNoteId.value = id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/x-quickmark-note', String(id));
}

function onNoteDragOver(e, id) {
  if (dragNoteId.value && dragNoteId.value !== id) {
    dragOverNoteId.value = id;
  }
}

// 核心排序逻辑: 桌面 drop / 触摸放置共用
async function reorderNotes(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  // 从 store 取出笔记列表，重新排序
  const sorted = store.notes.slice(); // 浅拷贝
  const fromIdx = sorted.findIndex(n => n.id === fromId);
  const toIdx = sorted.findIndex(n => n.id === toId);
  if (fromIdx < 0 || toIdx < 0) return;
  const [moved] = sorted.splice(fromIdx, 1);
  // 始终"插到 toIdx 位置": 拖到目标 = 换序到目标位置 (与 CategoryTreeNode 保持一致)
  // 原来 fromIdx < toIdx 时用 toIdx - 1, 会让拖到紧邻下一项的操作变成 no-op
  const insertAt = toIdx;
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

async function onNoteDrop(e, id) {
  const fromId = dragNoteId.value;
  const toId = id;
  dragOverNoteId.value = null;
  dragNoteId.value = null;
  await reorderNotes(fromId, toId);
}

function onNoteDragEnd() {
  dragNoteId.value = null;
  dragOverNoteId.value = null;
}

// ===== 触摸拖拽排序 (手机/平板, HTML5 draggable 在触摸端不触发) =====
// 整卡长按进入拖拽态: 按住不动 350ms = 拖拽; 一上来就滑 = 滚动(取消)。与 CategoryTreeNode 同理。
const TOUCH_LONG_PRESS_MS = 350;
// 长按计时器触发前, 手指移动超过此值才判定为"滚动列表"并放弃拖拽。
// 必须 < 浏览器滚动手势阈值(约 8px, touch slop): 只有在该阈值内 preventDefault 才能拦住浏览器滚动;
// 之前设 20px 反而让 8~20px 落进"浏览器已开滚、preventDefault 无效"的失效区 —— 这才是手机端拖拽偶发失效的真正根因。
// 设 6px: 手指基本静止(微动 <6px)即能稳定进入拖拽; 明显移动(>6px)则判定为滚动并放行。
const TOUCH_MOVE_TOLERANCE = 6;
const touchDragState = { noteId: null, startY: 0, startX: 0, el: null, scrollEl: null, activated: false, timer: null };

// 整卡 touchstart: 启动长按计时器 (不 preventDefault, 保证列表可滑动)
function onNoteTouchStart(e) {
  if (!store.isMobile || e.touches.length !== 1 || dragNoteId.value) return;
  const t = e.touches[0];
  const idAttr = e.currentTarget.dataset.id;
  if (!idAttr) return;
  touchDragState.noteId = Number(idAttr);
  touchDragState.startY = t.clientY;
  touchDragState.startX = t.clientX;
  touchDragState.el = e.currentTarget; // 包裹层承载 translateY 位移与 touch-lifted 高亮
  touchDragState.scrollEl = e.currentTarget.closest('.panel-scroll'); // 拖拽态要锁定的滚动容器
  touchDragState.activated = false;
  clearTimeout(touchDragState.timer);
  touchDragState.timer = setTimeout(() => {
    if (touchDragState.noteId == null) return;
    touchDragState.activated = true;
    dragNoteId.value = touchDragState.noteId;
    touchDragState.el?.classList.add('touch-lifted');
    // 锁定列表滚动, 防止拖拽中浏览器把纵向手势判为滚动而发 touchcancel 打断裂拽
    if (touchDragState.scrollEl) touchDragState.scrollEl.style.overflow = 'hidden';
  }, TOUCH_LONG_PRESS_MS);
}

function onNoteTouchMove(e) {
  if (touchDragState.noteId == null && !dragNoteId.value) return;
  // 长按未激活: 判断手指移动意图
  if (!touchDragState.activated && touchDragState.noteId != null) {
    const dy = Math.abs(e.touches[0].clientY - touchDragState.startY);
    const dx = Math.abs(e.touches[0].clientX - touchDragState.startX);
    if (dy > TOUCH_MOVE_TOLERANCE || dx > TOUCH_MOVE_TOLERANCE) {
      // 明显移动 = 用户想滚动列表, 取消长按拖拽, 放行原生滚动
      clearTimeout(touchDragState.timer);
      touchDragState.noteId = null;
    } else {
      // 小幅移动(含手指自然抖动): 拦截滚动, 但**不取消计时器** —— 给 350ms 长按触发机会
      // (之前移动 >10px 就取消, 导致手指轻微滑动即误判为滚动、拖拽起不来 —— 手机端偶发失效主因)
      e.preventDefault();
    }
    return;
  }
  // 拖拽中: 阻止页面滚动, 卡片跟随手指, 实时计算目标行
  e.preventDefault();
  const t = e.touches[0];
  const shift = t.clientY - touchDragState.startY;
  if (touchDragState.el) touchDragState.el.style.transform = `translateY(${shift}px)`;
  // 目标命中: 与桌面端 dragover 一致 —— 高亮"被拖卡片视觉中心此刻悬停在哪一张上"。
  // 用被拖卡片视觉中心(含 translateY)判定, 而非手指位置, 避免手机端卡片跟手位移致下方卡片提前变蓝;
  // 遍历跳过被拖卡片自身 + 中线语义, 方向无关、稳定命中(顶部拖到底部方向性失效根因已修)。
  let target = null;
  const draggedRect = touchDragState.el ? touchDragState.el.getBoundingClientRect() : null;
  const draggedCenter = draggedRect ? draggedRect.top + draggedRect.height / 2 : t.clientY;
  for (const el of noteEls.value) {
    if (!el || el === touchDragState.el) continue;
    const r = el.getBoundingClientRect();
    if (draggedCenter >= r.top && draggedCenter <= r.bottom) { target = el.dataset.id; break; }
  }
  if (!target) {
    // 卡片中心在两行间隙 → 取"中心下方的第一张卡片"之前(中线语义)
    for (const el of noteEls.value) {
      if (!el || el === touchDragState.el) continue;
      const r = el.getBoundingClientRect();
      if (draggedCenter < r.top + r.height / 2) { target = el.dataset.id; break; }
    }
  }
  if (!target) {
    // 在所有卡片之下 → 落到最后一张(非被拖)
    for (let i = noteEls.value.length - 1; i >= 0; i--) {
      const el = noteEls.value[i];
      if (el && el !== touchDragState.el) { target = el.dataset.id; break; }
    }
  }
  dragOverNoteId.value = target && target !== String(dragNoteId.value) ? Number(target) : null;
}

function onNoteTouchEnd() {
  clearTimeout(touchDragState.timer);
  const st = touchDragState;
  const fromId = dragNoteId.value;
  const toId = dragOverNoteId.value;
  if (st.el) {
    st.el.classList.remove('touch-lifted');
    st.el.style.transform = '';
  }
  if (st.scrollEl) st.scrollEl.style.overflow = ''; // 恢复列表滚动
  const wasDragging = st.activated;
  st.noteId = null;
  st.el = null;
  st.scrollEl = null;
  st.activated = false;
  st.timer = null;
  dragNoteId.value = null;
  dragOverNoteId.value = null;
  if (wasDragging && fromId) {
    // 拖拽松手后系统可能补发 click, 会误触发"打开笔记", 这里吞掉它
    const swallowClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); document.removeEventListener('click', swallowClick, true); };
    document.addEventListener('click', swallowClick, true);
    if (toId) reorderNotes(fromId, toId);
  }
}

function onNoteTouchCancel() {
  clearTimeout(touchDragState.timer);
  if (touchDragState.el) {
    touchDragState.el.classList.remove('touch-lifted');
    touchDragState.el.style.transform = '';
  }
  if (touchDragState.scrollEl) touchDragState.scrollEl.style.overflow = ''; // 恢复列表滚动
  touchDragState.noteId = null;
  touchDragState.el = null;
  touchDragState.scrollEl = null;
  touchDragState.activated = false;
  touchDragState.timer = null;
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
  refreshDueNotes();
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
  opacity: 0.35;
  transition: opacity 0.15s;
}
/* 触摸长按拖拽: 被拖卡片浮起 (跟随手指的位移在 JS 里以 transform 设置)
   仅用 outline + 浅底 + 阴影强调, 不动 transform, 避免覆盖 JS 的 translateY 跟手位移 */
.touch-lifted {
  opacity: 0.95 !important;
  background: var(--color-primary-subtle, rgba(91,110,245,0.12)) !important;
  outline: 2px solid var(--color-primary) !important;
  outline-offset: -2px;
  box-shadow: var(--shadow-xl, 0 12px 32px rgba(0,0,0,0.2)) !important;
  border-radius: 12px;
  position: relative;
  z-index: 5;
  transition: box-shadow 0.1s, opacity 0.1s;
}
/* 触摸设备: 禁文本选择, 避免长按卡片弹出系统放大镜/选择菜单 */
@media (hover: none) {
  .notelist-container {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
}
/* 目标卡片: 清晰的"将插入到这里"提示 — 浅底 + 主色描边 + 顶部高亮插入条
   z-index 提到被拖卡片之上, 避免被跟手的浮起卡片盖住而看不到提示 */
.note-drop-here {
  position: relative;
  z-index: 6;
  background: var(--color-primary-subtle, rgba(91,110,245,0.14)) !important;
  box-shadow: inset 0 0 0 1.5px var(--color-primary) !important;
  border-radius: 12px;
}
.note-drop-here::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  top: -6px;
  height: 3px;
  background: var(--color-primary);
  border-radius: 2px;
  box-shadow: 0 0 6px var(--color-primary);
  animation: dropPulse 0.8s ease-in-out infinite alternate;
}
@keyframes dropPulse {
  from { opacity: 0.35; transform: scaleX(0.85); }
  to { opacity: 1; transform: scaleX(1); }
}
</style>
