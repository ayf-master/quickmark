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

        <!-- 笔记卡片 -->
        <div
          v-for="card in cards"
          :key="card.id"
          class="note-card"
          :class="{ dragging: card.id === draggingId }"
          :style="cardStyle(card)"
          @pointerdown.stop="onCardDragStart($event, card)"
          @dblclick="openNote(card)">
          <div class="card-title">{{ card.title || '无标题' }}</div>
          <div class="card-preview" v-if="card.content">{{ cardPreview(card.content) }}</div>
          <div class="card-categories" v-if="card.category_names?.length">
            <span v-for="cn in card.category_names.slice(0, 3)" :key="cn" class="card-cat-tag">{{ cn }}</span>
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
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

// ===== 卡片状态 =====
const cards = ref([]);
const draggingId = ref(null);
const dragOffset = reactive({ x: 0, y: 0 });
const dragStartClient = reactive({ x: 0, y: 0 });
const positions = reactive({}); // { noteId: {x, y} }

// ===== 触摸状态 (双指缩放) =====
const isPinching = ref(false);
let pinchDist = 0;

const gridStep = 40;
const gridSize = 2000;

const worldStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0'
}));

function cardStyle(card) {
  const pos = positions[card.id] || { x: 0, y: 0 };
  return {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    cursor: draggingId.value === card.id ? 'grabbing' : 'grab'
  };
}

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

// ===== 卡片拖拽 (pointer 事件, 鼠标与触摸通用) =====

function onCardDragStart(e, card) {
  draggingId.value = card.id;
  const pos = positions[card.id] || { x: 0, y: 0 };
  dragOffset.x = e.clientX - pos.x;
  dragOffset.y = e.clientY - pos.y;
  dragStartClient.x = e.clientX;
  dragStartClient.y = e.clientY;
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd);
}

function onDragMove(e) {
  if (!draggingId.value) return;
  positions[draggingId.value] = {
    x: e.clientX - dragOffset.x,
    y: e.clientY - dragOffset.y
  };
  // 触发响应式更新
  positions[draggingId.value] = { ...positions[draggingId.value] };
}

function onDragEnd(e) {
  const moved = Math.hypot(
    (e?.clientX ?? dragStartClient.x) - dragStartClient.x,
    (e?.clientY ?? dragStartClient.y) - dragStartClient.y
  );
  const card = cards.value.find(c => c.id === draggingId.value);
  draggingId.value = null;
  document.removeEventListener('pointermove', onDragMove);
  document.removeEventListener('pointerup', onDragEnd);
  // 触摸端没有可靠的 dblclick: 位移极小 (<10px) 视为点击, 打开笔记
  if (card && e?.pointerType === 'touch' && moved < 10) {
    openNote(card);
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
}

// ===== 加载笔记 =====

onMounted(async () => {
  document.addEventListener('keydown', onKeydown);
  try {
    const notes = await API.getNotes({});
    cards.value = notes || [];
    // 给每个笔记分配一个随机的初始位置 (如果还没保存过)
    const cols = Math.ceil(Math.sqrt(notes.length || 1));
    notes.forEach((n, i) => {
      if (positions[n.id] == null) {
        positions[n.id] = {
          x: 60 + (i % cols) * 240,
          y: 60 + Math.floor(i / cols) * 160
        };
      }
    });
  } catch (e) {
    console.warn('加载画布笔记失败:', e);
  }
});

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

/* ===== 笔记卡片 ===== */
.note-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 200px;
  padding: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  box-shadow: var(--shadow-md);
  cursor: grab;
  transition: box-shadow .2s;
  user-select: none;
  touch-action: none;
}
.note-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary);
}
.note-card.dragging {
  box-shadow: var(--shadow-xl);
  z-index: 10;
  opacity: 0.9;
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
