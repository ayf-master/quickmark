<template>
  <div class="canvas-root" ref="rootRef">
    <!-- 顶部工具栏 -->
    <div class="canvas-toolbar">
      <span class="toolbar-title">🖼 知识画布</span>
      <div class="toolbar-actions">
        <button class="toolbar-btn" @click="zoomIn" title="放大">＋</button>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        <button class="toolbar-btn" @click="zoomOut" title="缩小">−</button>
        <button class="toolbar-btn" @click="resetView" title="重置视图">⊜</button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn btn-close" @click="closeCanvas" title="关闭画布 (Esc)">✕</button>
      </div>
    </div>

    <!-- 画布容器 (处理 pan/zoom; pointer 事件同时支持鼠标与触摸) -->
    <div class="canvas-viewport"
      @wheel.prevent="onWheel"
      @pointerdown="onPanStart"
      @pointermove="onPanMove"
      @pointerup="onPanEnd"
      @pointerleave="onPanEnd"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd">
      <!-- 画布内部, 靠 transform 实现缩放和位移 -->
      <div class="canvas-world" :style="worldStyle">
        <!-- 网格背景 (视觉辅助) -->
        <svg class="canvas-grid" :width="gridSize" :height="gridSize">
          <defs>
            <pattern id="grid-small" :width="gridStep" :height="gridStep" patternUnits="userSpaceOnUse">
              <path :d="`M ${gridStep} 0 L 0 0 0 ${gridStep}`" fill="none" stroke="var(--border-default)" stroke-width="0.5" opacity="0.4"/>
            </pattern>
            <pattern id="grid-large" :width="gridStep*5" :height="gridStep*5" patternUnits="userSpaceOnUse">
              <rect width="100%" height="100%" fill="url(#grid-small)"/>
              <path :d="`M ${gridStep*5} 0 L 0 0 0 ${gridStep*5}`" fill="none" stroke="var(--border-default)" stroke-width="1" opacity="0.6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-large)"/>
        </svg>

        <!-- 分类组块: 按分类把笔记分成一块一块, 块内网格排布 -->
        <div
          v-for="g in groups"
          :key="g.key"
          class="canvas-group"
          :class="{ 'group-dragging': draggingGroup === g.key }"
          :style="groupStyle(g)">
          <!-- 组块标题栏 (整块的拖拽把手) -->
          <div class="group-head" @pointerdown.stop="onGroupDragStart($event, g)">
            <span class="group-dot" :style="{ background: g.color }"></span>
            <span class="group-name" :title="g.name">{{ g.name }}</span>
            <span class="group-count">{{ g.notes.length }}</span>
            <button class="group-add" @pointerdown.stop @click.stop="startAddNote(g)"
              :title="'在「' + g.name + '」下新建笔记'">＋</button>
          </div>
          <!-- 块内笔记网格 -->
          <div class="group-body" :style="{ gridTemplateColumns: `repeat(${GROUP_COLS}, ${CARD_W}px)` }">
            <div
              v-for="card in g.notes"
              :key="card.id"
              class="note-card"
              @pointerdown.stop
              @click="openNote(card)">
              <button class="card-del" @pointerdown.stop @click.stop="removeNote(card)" title="删除笔记">✕</button>
              <div class="card-title">{{ card.title || '无标题' }}</div>
              <div class="card-preview" v-if="card.content">{{ cardPreview(card.content) }}</div>
            </div>
            <!-- 新建笔记的就地输入 -->
            <div v-if="addingGroup === g.key" class="note-card note-card-new">
              <input ref="newNoteInput"
                v-model="newNoteTitle"
                @keydown.enter.prevent="confirmAddNote(g)"
                @keydown.esc="cancelAddNote"
                @blur="cancelAddNote"
                placeholder="输入标题后回车"
                class="new-note-input" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-if="cards.length === 0" class="canvas-empty">
      <p>画布上没有笔记</p>
      <p class="empty-sub">打开一些笔记, 它们会出现在画布上</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { store } from '@/store';
import API from '@/api/index.js';

const emit = defineEmits(['close']);

// ===== 视图状态 =====
const rootRef = ref(null);
const scale = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const panStart = reactive({ x: 0, y: 0, panX: 0, panY: 0 });

// ===== 笔记状态 =====
const cards = ref([]);
// 拖拽偏移量 (组块与画布平移共用)
const dragOffset = reactive({ x: 0, y: 0 });

// ===== 触摸状态 (双指缩放) =====
const isPinching = ref(false);
let pinchDist = 0;

const gridStep = 40;
const gridSize = 2000;

const worldStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0'
}));


// ===== 视图控制 =====

function onWheel(e) {
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(3, Math.max(0.2, scale.value * delta));
  scale.value = newScale;
}

function zoomIn() { scale.value = Math.min(3, scale.value * 1.25); }
function zoomOut() { scale.value = Math.max(0.2, scale.value * 0.8); }
function resetView() { scale.value = 1; panX.value = 0; panY.value = 0; }
function closeCanvas() { emit('close'); }

function onKeydown(e) {
  if (e.key === 'Escape') { closeCanvas(); }
}

function onPanStart(e) {
  if (e.button !== 0 || e.target.closest('.note-card') || isPinching.value) return;
  isPanning.value = true;
  panStart.x = e.clientX;
  panStart.y = e.clientY;
  panStart.panX = panX.value;
  panStart.panY = panY.value;
}

function onPanMove(e) {
  if (!isPanning.value) return;
  panX.value = panStart.panX + (e.clientX - panStart.x);
  panY.value = panStart.panY + (e.clientY - panStart.y);
}

function onPanEnd() { isPanning.value = false; }

// ===== 双指缩放 (触摸设备) =====

function onTouchStart(e) {
  if (e.touches.length !== 2) return;
  isPinching.value = true;
  isPanning.value = false;
  pinchDist = Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY
  );
}

function onTouchMove(e) {
  if (!isPinching.value || e.touches.length !== 2) return;
  const d = Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY
  );
  if (pinchDist > 0) {
    scale.value = Math.min(3, Math.max(0.2, scale.value * (d / pinchDist)));
  }
  pinchDist = d;
}

function onTouchEnd() {
  isPinching.value = false;
  pinchDist = 0;
}

// ===== 组块化布局 =====
// 笔记按所属分类聚成一块, 块内网格排布; 拖动块标题栏可整块移动
const CARD_W = 200;
const CARD_H = 92;
const CARD_GAP = 10;
const GROUP_COLS = 2;      // 每块每行放几张卡
const GROUP_GAP = 36;      // 块与块的间距
const LAYOUT_W = 1500;     // 自动布局的折行宽度

const groupPositions = reactive({}); // { groupKey: {x, y} }
const draggingGroup = ref(null);
const addingGroup = ref(null);
const newNoteTitle = ref('');
const newNoteInput = ref(null);

// 按分类分组: 多条分类的笔记归到第一个分类下; 无分类的进「未归类」
const groups = computed(() => {
  const map = new Map();
  for (const n of cards.value) {
    const cid = n.category_ids && n.category_ids.length ? n.category_ids[0] : 0;
    if (!map.has(cid)) {
      const cat = store.categories.find(c => c.id === cid);
      map.set(cid, {
        key: cid,
        name: cid ? (cat?.name || '未知分类') : '未归类',
        color: cid ? (cat?.color || '#8b5cf6') : '#94a3b8',
        notes: []
      });
    }
    map.get(cid).notes.push(n);
  }
  // 块内按列表顺序 (position) 排, 与侧栏一致
  const order = new Map(cards.value.map((n, i) => [n.id, i]));
  for (const g of map.values()) g.notes.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return [...map.values()];
});

function groupSize(g) {
  const rows = Math.max(1, Math.ceil(g.notes.length / GROUP_COLS));
  return {
    w: 24 + GROUP_COLS * CARD_W + (GROUP_COLS - 1) * CARD_GAP,
    h: 24 + 34 + 8 + rows * CARD_H + (rows - 1) * CARD_GAP
  };
}

function groupStyle(g) {
  const pos = groupPositions[g.key] || { x: 0, y: 0 };
  return {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    width: groupSize(g).w + 'px'
  };
}

// 首次渲染时给没位置的块自动排一遍 (左→右, 放不下就换行)
function layoutGroups() {
  let x = 40, y = 40, rowH = 0;
  for (const g of groups.value) {
    if (groupPositions[g.key] != null) continue;
    const { w, h } = groupSize(g);
    if (x > 40 && x + w > LAYOUT_W) {
      x = 40;
      y += rowH + GROUP_GAP;
      rowH = 0;
    }
    groupPositions[g.key] = { x, y };
    x += w + GROUP_GAP;
    rowH = Math.max(rowH, h);
  }
}
watch(groups, () => layoutGroups(), { immediate: true });

// ===== 组块拖拽 =====

function onGroupDragStart(e, g) {
  if (e.button != null && e.button !== 0) return;
  draggingGroup.value = g.key;
  const pos = groupPositions[g.key] || { x: 0, y: 0 };
  dragOffset.x = e.clientX / scale.value - pos.x;
  dragOffset.y = e.clientY / scale.value - pos.y;
  document.addEventListener('pointermove', onGroupDragMove);
  document.addEventListener('pointerup', onGroupDragEnd);
}

function onGroupDragMove(e) {
  if (draggingGroup.value == null) return;
  groupPositions[draggingGroup.value] = {
    x: e.clientX / scale.value - dragOffset.x,
    y: e.clientY / scale.value - dragOffset.y
  };
}

function onGroupDragEnd() {
  draggingGroup.value = null;
  document.removeEventListener('pointermove', onGroupDragMove);
  document.removeEventListener('pointerup', onGroupDragEnd);
}

// ===== 在组块内新建 / 删除笔记 =====

function startAddNote(g) {
  addingGroup.value = g.key;
  newNoteTitle.value = '';
  nextTick(() => newNoteInput.value?.focus());
}

function cancelAddNote() {
  addingGroup.value = null;
  newNoteTitle.value = '';
}

async function confirmAddNote(g) {
  const title = newNoteTitle.value.trim() || '新笔记';
  try {
    const note = await API.createNote({
      title,
      content: '',
      category_ids: g.key ? [g.key] : []
    });
    await reload();
    addingGroup.value = null;
    newNoteTitle.value = '';
    store.showToast('已创建: ' + title);
    // 建完直接跳过去编辑, 画布是浮层会挡住编辑器
    store.openNote(note);
    emit('close');
  } catch (e) {
    store.showToast('创建失败', 'error');
  }
}

async function removeNote(card) {
  if (!window.confirm(`确定删除笔记「${card.title || '无标题'}」？此操作不可撤销。`)) return;
  try {
    await API.deleteNote(card.id);
    cards.value = cards.value.filter(c => c.id !== card.id);
    // 删的正好是当前打开的笔记 → 关掉编辑器, 避免残留编辑态
    if (store.editingNote?.id === card.id) store.closeEditor();
    store.loadNotes();
    store.showToast('已删除');
  } catch (e) {
    store.showToast('删除失败', 'error');
  }
}

// ===== 工具 =====

function cardPreview(content) {
  if (!content) return '';
  // 取前 60 个字符, 去掉 Markdown/HTML 标记
  const plain = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .trim();
  return plain.slice(0, 60) + (plain.length > 60 ? '…' : '');
}

function openNote(card) {
  store.openNote(card);
  // 画布是全屏浮层, 不关掉会盖住编辑器
  emit('close');
}

// ===== 加载笔记 =====

onMounted(async () => {
  document.addEventListener('keydown', onKeydown);
  // 组块标题要显示分类名和颜色, 先确保分类已加载
  if (!store.categories || store.categories.length === 0) {
    store.loadCategories().catch(() => {});
  }
  await reload();
});

async function reload() {
  try {
    const notes = await API.getNotes({});
    cards.value = notes || [];
    layoutGroups();
  } catch (e) {
    console.warn('加载画布笔记失败:', e);
  }
}

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.canvas-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--bg-panel);
  display: flex;
  flex-direction: column;
}

/* ===== 工具栏 ===== */
.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-default);
  z-index: 10;
  flex-shrink: 0;
}
.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.toolbar-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid var(--border-default);
  background: var(--bg-panel);
  color: var(--text-primary);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
  line-height: 1;
}
.toolbar-btn:hover {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border-default);
  margin: 0 2px;
}
.btn-close {
  font-size: 14px;
  color: var(--text-tertiary);
}
.btn-close:hover {
  color: var(--color-danger, #ef4444) !important;
  border-color: var(--color-danger, #ef4444) !important;
}
.zoom-level {
  font-size: 12px;
  color: var(--text-tertiary);
  min-width: 38px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ===== 视口 ===== */
.canvas-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  cursor: grab;
  /* 触摸设备: 手势全部交给画布 (单指平移/双指缩放), 禁止浏览器默认滚动与缩放 */
  touch-action: none;
}
.canvas-viewport:active {
  cursor: grabbing;
}
.canvas-world {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}
.canvas-grid {
  display: block;
  pointer-events: none;
}

/* ===== 分类组块 ===== */
.canvas-group {
  position: absolute;
  top: 0;
  left: 0;
  padding: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  user-select: none;
}
.canvas-group.group-dragging {
  box-shadow: var(--shadow-xl);
  border-color: var(--color-primary);
  z-index: 5;
}
.group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  margin-bottom: 8px;
  padding: 0 2px;
  cursor: grab;
  border-bottom: 1px dashed var(--border-subtle, var(--border-default));
}
.canvas-group.group-dragging .group-head { cursor: grabbing; }
.group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.group-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-count {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  border-radius: 9px;
  padding: 0 6px;
  flex-shrink: 0;
}
.group-add {
  margin-left: auto;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--border-default);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.group-add:hover {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.group-body {
  display: grid;
  gap: 10px;
}

/* ===== 笔记卡片 ===== */
.note-card {
  position: relative;   /* 块内由 grid 排布, 不再绝对定位 */
  width: 200px;
  height: 92px;
  padding: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  box-shadow: var(--shadow-sm, var(--shadow-md));
  cursor: pointer;
  transition: box-shadow .2s, border-color .2s;
  user-select: none;
  overflow: hidden;
}
.note-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary);
}
.note-card-new {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: default;
}
.new-note-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text-primary);
}
.card-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.note-card:hover .card-del { opacity: 1; }
.card-del:hover {
  background: var(--color-danger, #ef4444);
  color: #fff;
}
.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-preview {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}
.card-categories {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.card-cat-tag {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg-panel);
  color: var(--text-tertiary);
  border: 1px solid var(--border-default);
}

/* ===== 空状态 ===== */
.canvas-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
  pointer-events: none;
}
.canvas-empty .empty-sub {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.7;
}
</style>
