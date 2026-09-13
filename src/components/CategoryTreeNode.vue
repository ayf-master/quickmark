<template>
  <div>
    <div draggable="true"
      :data-cat-id="node.id"
      @click="$emit('select', node)"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchCancel"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
      @dragend="onDragEnd"
      :class="['w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center justify-between transition-all mb-0.5 group category-row min-w-0 overflow-hidden', { 'is-selected': store.selectedCategoryId === node.id, 'cat-dragging': dragging, 'cat-drop-here': dropHere }]">
      <span class="flex items-center gap-1.5 min-w-0 flex-1">
        <!-- 展开/折叠箭头 -->
        <button v-if="node.children && node.children.length > 0"
          @click.stop="$emit('toggle-expand', node.id)"
          class="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          :aria-label="store.isCategoryExpanded(node.id) ? '折叠' : '展开'"
          :aria-expanded="store.isCategoryExpanded(node.id)">
          <svg class="w-3 h-3 transition-transform"
            :class="{ 'rotate-90': store.isCategoryExpanded(node.id) }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
        <span v-else class="w-4 h-4 flex-shrink-0"></span>

        <!-- 颜色圆点 -->
        <span class="w-2 h-2 rounded-full flex-shrink-0"
          :style="{ backgroundColor: node.color }"></span>

        <!-- 名字 -->
        <span class="truncate" :title="node.name" v-text="node.name"></span>
      </span>
      <!-- 长按全名气泡 (Teleport 到 body, 避免被行的 overflow-hidden 裁掉) -->
      <Teleport to="body">
        <div v-if="nameTip.visible" class="cat-name-tip"
          :style="{ left: nameTip.x + 'px', top: nameTip.y + 'px' }"
          v-text="node.name"></div>
      </Teleport>
      <span class="flex items-center gap-1 flex-shrink-0">
        <span class="text-xs" style="color: var(--text-tertiary);" v-text="node.note_count"></span>
        <!-- 新建笔记 (在此分类下) -->
        <button @click.stop="store.createNote(node.id)"
          class="btn btn-icon-sm btn-ghost"
          :aria-label="'在 ' + node.name + ' 中新建笔记'"
          :title="'在 ' + node.name + ' 中新建笔记'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
        <!-- 新建子分类 (hover 才出现) -->
        <button @click.stop="$emit('create-child', node.id)"
          class="btn btn-icon-sm btn-ghost action-hover"
          :aria-label="'在 ' + node.name + ' 下新建子分类'"
          :title="'在 ' + node.name + ' 下新建子分类'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 7h18M3 12h18M3 17h12"/>
          </svg>
        </button>
        <!-- 编辑 -->
        <button @click.stop="$emit('edit', node)"
          class="btn btn-icon-sm btn-ghost action-hover"
          :aria-label="'编辑分类 ' + node.name"
          title="编辑">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <!-- 删除 -->
        <button @click.stop="$emit('delete', node)"
          class="btn btn-icon-sm btn-ghost action-hover"
          :aria-label="'删除分类 ' + node.name"
          title="删除">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style="color: var(--color-danger);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </span>
    </div>

    <!-- 递归子节点 -->
    <div v-if="node.children && node.children.length > 0 && store.isCategoryExpanded(node.id)"
      class="cat-children"
      :data-depth="depth">
      <CategoryTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @select="(n) => $emit('select', n)"
        @create-child="(pid) => $emit('create-child', pid)"
        @edit="(n) => $emit('edit', n)"
        @delete="(n) => $emit('delete', n)"
        @toggle-expand="(id) => $emit('toggle-expand', id)" />
    </div>
  </div>
</template>

<script>
// 模块级共享变量 — 跨所有 CategoryTreeNode 实例共享拖拽状态
let dragCatId = null;
// 触摸长按拖拽状态 (跨递归实例共享, 与 dragCatId 同理)
let touchDrag = { timer: null, id: null, startY: 0, startX: 0, el: null, activated: false };
</script>

<script setup>
import { ref, reactive, Teleport } from 'vue';
import { store } from '@/store';
import API from '@/api/index.js';

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 }
});
const emit = defineEmits(['select', 'create-child', 'edit', 'delete', 'toggle-expand', 'drag-cat-start', 'drag-cat-over', 'drag-cat-drop', 'drag-cat-end']);

const dragging = ref(false);
const dropHere = ref(false);

// 长按显示完整分类名的气泡 (手机端名字被省略, title 无效; 桌面走原生 title)
// 借用长按拖拽的激活时机显示, 触摸结束/取消时隐藏
const nameTip = reactive({ visible: false, x: 0, y: 0 });

function onDragStart(e) {
  dragging.value = true;
  dragCatId = props.node.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(props.node.id));
  emit('drag-cat-start', props.node.id);
}

function onDragOver(e) {
  // Note drag (cross-zone from NoteList) — no visual feedback needed, just allow drop
  if (e.dataTransfer.types && e.dataTransfer.types.includes('application/x-quickmark-note')) {
    return;
  }
  // Category drag (reorder)
  if (dragCatId && dragCatId !== props.node.id) {
    dropHere.value = true;
    emit('drag-cat-over', props.node.id);
  }
}

// 核心重排逻辑: 桌面 drop / 触摸放置共用 (只重排与目标同级的分类)
async function reorderCategory(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const targetCat = store.categories.find(c => c.id === toId);
  if (!targetCat) return;
  const parentId = targetCat.parent_id;
  // 找出所有同级分类, 按当前顺序排列
  const siblingIds = store.categories
    .filter(c => c.parent_id === parentId)
    .sort((a, b) => a.position - b.position)
    .map(c => c.id);
  const fromIdx = siblingIds.indexOf(fromId);
  const toIdx = siblingIds.indexOf(toId);
  if (fromIdx < 0 || toIdx < 0) return;
  // 重新排列 ID 顺序
  // 始终"插到 toIdx 位置", 与从下往上方向一致: 拖到目标 = 换序到目标位置
  // 原来 fromIdx < toIdx 时用 toIdx - 1, 会让拖到紧邻下一项的操作变成 no-op
  siblingIds.splice(fromIdx, 1);
  const insertAt = toIdx;
  siblingIds.splice(insertAt, 0, fromId);
  // 更新 store.categories 中所有同级分类的 position
  siblingIds.forEach((id, i) => {
    const cat = store.categories.find(c => c.id === id);
    if (cat) cat.position = i;
  });
  store.categories = [...store.categories];
  store.categoryListVersion = Date.now();
  try {
    await API.reorderCategories(siblingIds);
  } catch (err) {
    store.loadCategories();
  }
}

async function onDrop(e) {
  // Note drop: move note to this category
  const noteId = e.dataTransfer.getData('application/x-quickmark-note');
  if (noteId) {
    dragCatId = null;
    await store.moveNoteToCategory(Number(noteId), props.node.id);
    return;
  }
  // Category drop (reorder)
  dropHere.value = false;
  await reorderCategory(dragCatId, props.node.id);
  dragCatId = null;
}

function onDragEnd() {
  dragging.value = false;
  dropHere.value = false;
  dragCatId = null;
  emit('drag-cat-end');
}

// ===== 触摸长按拖拽排序 (手机/平板) =====
const TOUCH_LONG_PRESS_MS = 400;

function clearDropHereAll() {
  document.querySelectorAll('.category-row.cat-drop-here').forEach(el => el.classList.remove('cat-drop-here'));
}

function onTouchStart(e) {
  if (e.touches.length !== 1 || dragCatId) return;
  const t = e.touches[0];
  touchDrag.id = props.node.id;
  touchDrag.startY = t.clientY;
  touchDrag.startX = t.clientX;
  touchDrag.el = e.currentTarget;
  touchDrag.activated = false;
  touchDrag.timer = setTimeout(() => {
    touchDrag.activated = true;
    dragCatId = props.node.id;
    dragging.value = true;
    touchDrag.el?.classList.add('cat-touch-lifted');
    // 长按同时弹出全名气泡: 手机上名字被省略, 借长按看全名 (桌面走 title)
    nameTip.x = touchDrag.startX;
    nameTip.y = touchDrag.startY;
    nameTip.visible = true;
    emit('drag-cat-start', props.node.id);
  }, TOUCH_LONG_PRESS_MS);
}

function onTouchMove(e) {
  if (!dragCatId) {
    // 长按未激活: 手指移动超过阈值视为滚动, 取消长按
    if (touchDrag.id != null && e.touches.length) {
      if (Math.abs(e.touches[0].clientY - touchDrag.startY) > 10) {
        clearTimeout(touchDrag.timer);
        touchDrag.id = null;
      }
    }
    return;
  }
  // 拖拽中: 阻止滚动, 行跟随手指, 高亮手指下的目标行
  e.preventDefault();
  const t = e.touches[0];
  const shift = t.clientY - touchDrag.startY;
  if (touchDrag.el) touchDrag.el.style.transform = `translateY(${shift}px)`;
  const fingerY = t.clientY;
  let target = null;
  for (const row of document.querySelectorAll('.category-row')) {
    const r = row.getBoundingClientRect();
    if (fingerY >= r.top && fingerY <= r.bottom) {
      const cid = Number(row.dataset.catId);
      if (cid && cid !== dragCatId) target = cid;
      break;
    }
  }
  clearDropHereAll();
  if (target) {
    document.querySelector(`.category-row[data-cat-id="${target}"]`)?.classList.add('cat-drop-here');
  }
}

async function onTouchEnd() {
  clearTimeout(touchDrag.timer);
  const fromId = dragCatId;
  const targetRow = document.querySelector('.category-row.cat-drop-here');
  const toId = targetRow ? Number(targetRow.dataset.catId) : null;
  clearDropHereAll();
  if (touchDrag.el) {
    touchDrag.el.classList.remove('cat-touch-lifted');
    touchDrag.el.style.transform = '';
  }
  const wasDragging = touchDrag.activated;
  dragging.value = false;
  touchDrag = { timer: null, id: null, startY: 0, startX: 0, el: null, activated: false };
  dragCatId = null;
  nameTip.visible = false;
  emit('drag-cat-end');
  if (wasDragging && fromId) {
    // 长按松手后系统会补发 click, 会误触发"选中分类", 这里吞掉它
    const swallowClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); document.removeEventListener('click', swallowClick, true); };
    document.addEventListener('click', swallowClick, true);
    await reorderCategory(fromId, toId);
  }
}

function onTouchCancel() {
  clearTimeout(touchDrag.timer);
  clearDropHereAll();
  if (touchDrag.el) {
    touchDrag.el.classList.remove('cat-touch-lifted');
    touchDrag.el.style.transform = '';
  }
  dragging.value = false;
  touchDrag = { timer: null, id: null, startY: 0, startX: 0, el: null, activated: false };
  dragCatId = null;
  nameTip.visible = false;
  emit('drag-cat-end');
}
</script>

<style scoped>
/* 选中态: 浅蓝高亮 + 文字加粗 + 主色调
   必须在自身 scoped CSS 里写, Sidebar.vue scoped 选不到子组件元素 */
.category-row.is-selected {
  background-color: var(--bg-active) !important;
  color: var(--color-primary) !important;
  font-weight: 600;
}
.category-row.is-selected .truncate {
  opacity: 1 !important;
}

/* 子分类容器: 嵌套淡色块 + 左边线作为层级提示
   因为侧边栏宽度会随展开深度自适应变宽 (Sidebar.vue 的 maxExpandedDepth),
   这里只保留轻量的视觉提示, 名字不再被 padding 挤压 */
.cat-children {
  margin: 0;
  padding: 2px 0;
  padding-left: 8px;
  margin-left: 2px;
  border-left: 1.5px solid var(--border-default);
  border-radius: 0 6px 6px 0;
  background: color-mix(in srgb, var(--bg-input) 30%, transparent);
  min-width: 0;
  overflow: hidden;
  transition: padding 0.15s, margin 0.15s;
}

/* 子分类行: 字号略小, 文字稍淡, 名字优先被截断 */
.cat-children :deep(.category-row) {
  font-size: 0.8125rem;
  min-width: 0;
}
.cat-children :deep(.category-row .w-2) {
  width: 6px;
  height: 6px;
}
.cat-children :deep(.category-row .truncate) {
  opacity: 0.85;
  min-width: 0;
}

/* 深层分类 (>=2级) 管理按钮: 触摸设备常显; 鼠标设备 hover 行时才显示 */
/* 用 opacity + transform 而非 width/padding, hover 时不会冒出黑框, 保持形式统一 */
.cat-children :deep(.category-row .action-hover) {
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.15s, transform 0.15s;
}
@media (hover: hover) and (pointer: fine) {
  .cat-children :deep(.category-row .action-hover) {
    opacity: 0;
    transform: scale(0.85);
    pointer-events: none;
  }
  .cat-children :deep(.category-row:hover .action-hover) {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
}
.cat-dragging {
  opacity: 0.4 !important;
}
/* 触摸长按拖拽: 被拖行浮起 (位移在 JS 里以 transform 设置) */
.cat-touch-lifted {
  opacity: 0.85 !important;
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.15)) !important;
  position: relative;
  z-index: 6;
  transition: opacity 0.1s;
}
/* 触摸设备: 禁文本选择, 避免长按行弹出系统菜单 */
@media (hover: none) {
  .category-row {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
}
.cat-drop-here {
  position: relative;
  transform: translateX(6px);
}
.cat-drop-here::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: -3px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 1px;
  opacity: 0.6;
}

/* 长按显示的分类全名气泡 (fixed 跟随手指位置) */
.cat-name-tip {
  position: fixed;
  transform: translate(-50%, -130%);
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  max-width: 80vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 500;
  pointer-events: none;
}
</style>
