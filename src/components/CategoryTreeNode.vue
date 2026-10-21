<template>
  <div>
    <div :draggable="!store.isMobile"
      :data-cat-id="node.id"
      @click="$emit('select', node)"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchCancel"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @dragleave="onNoteDragLeave"
      @drop.prevent="onDrop"
      @dragend="onDragEnd"
      :class="['w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center justify-between transition-all mb-0.5 group category-row min-w-0', { 'is-selected': store.selectedCategoryId === node.id, 'cat-dragging': dragging, 'cat-drop-here': dropHere || catDragUI.dropHereId === node.id }]">
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

        <!-- 名字 (手机端分类页里会换行完整显示, 不再省略) -->
        <span class="truncate" :title="node.name" v-text="node.name"></span>
      </span>
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
import { reactive } from 'vue';
// 模块级共享变量 — 跨所有 CategoryTreeNode 实例共享拖拽状态
let dragCatId = null;
// 触摸长按拖拽状态 (跨递归实例共享, 与 dragCatId 同理)
let touchDrag = { timer: null, id: null, startY: 0, startX: 0, el: null, activated: false, origTop: 0, origBottom: 0 };
// 触摸拖拽的"目标行"高亮: 必须是跨实例共享的响应式状态, 否则在目标实例上用 classList
// 手动加类会被 Vue 重渲染时清掉 (导致手机端分类拖拽看不到蓝色提示, 但换序仍生效)
const catDragUI = reactive({ dropHereId: null });
</script>

<script setup>
import { ref } from 'vue';
import { store } from '@/store';
import API from '@/api/index.js';

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 }
});
const emit = defineEmits(['select', 'create-child', 'edit', 'delete', 'toggle-expand', 'drag-cat-start', 'drag-cat-over', 'drag-cat-drop', 'drag-cat-end']);

const dragging = ref(false);
const dropHere = ref(false);

function onDragStart(e) {
  dragging.value = true;
  dragCatId = props.node.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(props.node.id));
  emit('drag-cat-start', props.node.id);
}

function onDragOver(e) {
  // Note drag (cross-zone from NoteList) — 高亮当前分类行, 提示可放置
  if (e.dataTransfer.types && e.dataTransfer.types.includes('application/x-quickmark-note')) {
    dropHere.value = true;
    return;
  }
  // Category drag (reorder)
  if (dragCatId && dragCatId !== props.node.id) {
    dropHere.value = true;
    emit('drag-cat-over', props.node.id);
  }
}

// 笔记拖放移出本行时, 取消高亮 (dragover 会持续把光标所在行设回 true, 不会闪烁)
function onNoteDragLeave() {
  dropHere.value = false;
}

// 核心重排逻辑: 桌面 drop / 触摸放置共用 (只重排与目标同级的分类)
// 取被拖分类的同级兄弟 id 列表(顺序与 reorderCategory 一致), 供触摸拖拽的"目标命中"使用
function getSiblingIds(catId) {
  const cat = store.categories.find(c => c.id === catId);
  if (!cat) return [];
  return store.categories
    .filter(c => c.parent_id === cat.parent_id)
    .sort((a, b) => a.position - b.position)
    .map(c => c.id);
}

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
    e.stopPropagation(); // 阻止冒泡到侧栏容器, 避免重复处理
    dragCatId = null;
    dropHere.value = false;
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

// ===== 触摸排序: 整行长按进入拖拽态 (手机/平板) =====
// 触屏没有鼠标滚轮, 整行拖会和"上下滑滚动"冲突; 用"长按 350ms 再拖"区分:
// 手指按住不动超过阈值 = 进入拖拽; 一上来就滑动 = 视为滚动, 取消长按。
// 注: Vivo 等 ROM 长按文字可能弹系统识屏, 这是整行长按方案的固有代价(用户已知晓并接受)。
const TOUCH_LONG_PRESS_MS = 350;
// 长按计时器触发前, 手指移动超过此值才判定为"滚动列表"并放弃拖拽。
// 必须 < 浏览器滚动手势阈值(约 8px, touch slop): 只有在该阈值内 preventDefault 才能拦住浏览器滚动;
// 之前设 20px 反而让 8~20px 落进"浏览器已开滚、preventDefault 无效"的失效区(手机端拖拽偶发失效真正根因)。
const TOUCH_MOVE_TOLERANCE = 6;
// 拖拽态要锁定的滚动容器 (进入拖拽态时锁 overflow, 松手恢复)
let catScrollEl = null;

// 整行 touchstart: 记录起点, 启动长按计时器 (不 preventDefault, 保证列表可照常滑动)
function onTouchStart(e) {
  if (!store.isMobile || e.touches.length !== 1 || dragCatId) return;
  const t = e.touches[0];
  touchDrag.id = props.node.id;
  touchDrag.startY = t.clientY;
  touchDrag.startX = t.clientX;
  touchDrag.el = e.currentTarget.closest('.category-row');
  // 记录被拖行"未位移时"的原始位置(不含 translateY), 用于判断卡片是否仍停在自己那一格:
  // 静止(中心仍在自己格子内)时不算拖到任何目标, 避免"还没拖下一个分类就提前变蓝"
  if (touchDrag.el) {
    const er = touchDrag.el.getBoundingClientRect();
    touchDrag.origTop = er.top;
    touchDrag.origBottom = er.bottom;
  }
  touchDrag.activated = false;
  catScrollEl = e.currentTarget.closest('.panel-scroll'); // 拖拽态要锁定的滚动容器
  clearTimeout(touchDrag.timer);
  touchDrag.timer = setTimeout(() => {
    if (touchDrag.id == null) return;
    // 长按达成: 进入拖拽态, 整行浮起
    touchDrag.activated = true;
    dragCatId = props.node.id;
    dragging.value = true;
    touchDrag.el?.classList.add('cat-touch-lifted');
    // 锁定列表滚动, 防止拖拽中浏览器把纵向手势判为滚动而发 touchcancel 打断裂拽
    if (catScrollEl) catScrollEl.style.overflow = 'hidden';
    emit('drag-cat-start', props.node.id);
  }, TOUCH_LONG_PRESS_MS);
}

function onTouchMove(e) {
  if (touchDrag.id == null && !dragCatId) return;
  // 长按未激活: 手指移动的判断
  if (!touchDrag.activated && touchDrag.id != null) {
    const dy = Math.abs(e.touches[0].clientY - touchDrag.startY);
    const dx = Math.abs(e.touches[0].clientX - touchDrag.startX);
    if (dy > TOUCH_MOVE_TOLERANCE || dx > TOUCH_MOVE_TOLERANCE) {
      // 明显移动 = 用户想滚动列表, 取消长按拖拽, 放行滚动
      clearTimeout(touchDrag.timer);
      touchDrag.id = null;
    } else {
      // 轻微抖动: 拦住滚动, 给 350ms 长按计时器一个触发机会
      // (否则浏览器抢手势开始滚动并触发 touchcancel, 拖拽就再也起不来 —— 手机端笔记拖拽时灵时不灵的根因)
      e.preventDefault();
    }
    return;
  }
  // 拖拽中: 阻止滚动, 行跟随手指, 高亮目标行
  e.preventDefault();
  const t = e.touches[0];
  const shift = t.clientY - touchDrag.startY;
  if (touchDrag.el) touchDrag.el.style.transform = `translateY(${shift}px)`;
  // 目标命中: 与桌面端 dragover 一致 —— 高亮"被拖卡片此刻悬停在哪一行上", 而非手指位置。
  // 之前用 fingerY(手指=被拖卡片顶部)做中线判定; 手机端卡片跟手位移、主体延伸到手指下方,
  // 手指刚过下面某块中线、卡片主体才刚压上去时, 那块就提前变蓝(用户反馈的" premature blue")。
  // 改用"被拖卡片的视觉中心 draggedCenter"(getBoundingClientRect 含 transform)判定:
  //   - 卡片中心落在哪个同级行区间内 → 高亮该行(=插到它前面), 与桌面"光标悬哪行"一致;
  //   - 卡片中心在两行间隙 → 取中线语义落到下一行; 在所有行之下 → 落到最后一行。
  // 仍只在同级可见行(按 data-cat-id 精确取)上计算, 子分类不干扰。
  // 目标命中: 与桌面端 dragover 一致 —— 高亮"被拖卡片此刻悬停在哪一行上"。
  // 关键修复(用户反馈的 premature blue): 被拖卡片静止时其中心仍在自己那一格, 旧代码用
  // "卡片中心 < 下一行中线"判定, 导致刚长按、还没拖动就高亮下一个分类。
  // 改为: 先判断卡片中心是否还在"自己原来的格子"内(origTop..origBottom, 不含 transform 的原始位置);
  //   仍在自己格 → 不算拖到任何目标(target=null, 不高亮); 离开自己格(上/下)→ 再在同级可见行里找悬停目标。
  let target = null;
  const draggedRect = touchDrag.el ? touchDrag.el.getBoundingClientRect() : null;
  const draggedCenter = draggedRect ? draggedRect.top + draggedRect.height / 2 : t.clientY;
  const insideOwnSlot = draggedCenter >= touchDrag.origTop && draggedCenter <= touchDrag.origBottom;
  if (!insideOwnSlot) {
    const sibs = getSiblingIds(touchDrag.id);
    // 1) 卡片中心正落在某同级行区间内 → 该行
    for (const sid of sibs) {
      if (sid === touchDrag.id) continue;
      const row = document.querySelector(`.category-row[data-cat-id="${sid}"]`);
      if (!row) continue;
      const r = row.getBoundingClientRect();
      if (draggedCenter >= r.top && draggedCenter <= r.bottom) { target = sid; break; }
    }
    // 2) 落在行间间隙 → 取中心最近的同级行(上拖插上方/下拖插下方都正确)
    if (target == null) {
      let best = null, bestDist = Infinity;
      for (const sid of sibs) {
        if (sid === touchDrag.id) continue;
        const row = document.querySelector(`.category-row[data-cat-id="${sid}"]`);
        if (!row) continue;
        const r = row.getBoundingClientRect();
        const d = Math.abs(draggedCenter - (r.top + r.height / 2));
        if (d < bestDist) { bestDist = d; best = sid; }
      }
      target = best;
    }
  }
  // 用跨实例响应式状态高亮目标行 (避免被 Vue 重渲染清掉 class, 导致蓝条不显示)
  catDragUI.dropHereId = (target && target !== dragCatId) ? target : null;
}

async function onTouchEnd() {
  clearTimeout(touchDrag.timer);
  const fromId = dragCatId;
  const toId = catDragUI.dropHereId;
  catDragUI.dropHereId = null;
  if (touchDrag.el) {
    touchDrag.el.classList.remove('cat-touch-lifted');
    touchDrag.el.style.transform = '';
  }
  if (catScrollEl) catScrollEl.style.overflow = ''; // 恢复列表滚动
  catScrollEl = null;
  const wasDragging = touchDrag.activated;
  dragging.value = false;
  touchDrag = { timer: null, id: null, startY: 0, startX: 0, el: null, activated: false };
  dragCatId = null;
  emit('drag-cat-end');
  if (wasDragging && fromId) {
    // 拖拽松手后系统可能补发 click, 会误触发"选中分类", 这里吞掉它
    const swallowClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); document.removeEventListener('click', swallowClick, true); };
    document.addEventListener('click', swallowClick, true);
    await reorderCategory(fromId, toId);
  }
}

function onTouchCancel() {
  clearTimeout(touchDrag.timer);
  catDragUI.dropHereId = null;
  if (touchDrag.el) {
    touchDrag.el.classList.remove('cat-touch-lifted');
    touchDrag.el.style.transform = '';
  }
  if (catScrollEl) catScrollEl.style.overflow = ''; // 恢复列表滚动
  catScrollEl = null;
  dragging.value = false;
  touchDrag = { timer: null, id: null, startY: 0, startX: 0, el: null, activated: false };
  dragCatId = null;
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
  opacity: 0.35 !important;
}
/* 触摸长按拖拽: 被拖行浮起 (位移在 JS 里以 transform 设置)
   仅用 outline + 浅底 + 阴影强调, 不动 transform, 避免覆盖 JS 的 translateY 跟手位移 */
.cat-touch-lifted {
  opacity: 0.95 !important;
  background: var(--color-primary-subtle, rgba(91,110,245,0.12)) !important;
  outline: 2px solid var(--color-primary) !important;
  outline-offset: -2px;
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.22)) !important;
  border-radius: 10px;
  position: relative;
  z-index: 6;
  transition: box-shadow 0.1s, opacity 0.1s;
}
/* 触摸设备: 禁文本选择, 避免长按行弹出系统菜单 */
@media (hover: none) {
  .category-row {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
}
/* 目标行: 清晰的"将插入到这里"提示 — 浅底 + 主色描边 + 顶部高亮插入条
   z-index 提到被拖行之上, 避免短分类行被跟手的浮起行完全盖住而看不到提示 */
.cat-drop-here {
  position: relative;
  z-index: 7;
  background: var(--color-primary-subtle, rgba(91,110,245,0.14)) !important;
  box-shadow: inset 0 0 0 1.5px var(--color-primary) !important;
  border-radius: 10px;
}
.cat-drop-here::after {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  top: -4px;
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
