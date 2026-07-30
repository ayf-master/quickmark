<template>
  <Teleport to="body">
    <div v-if="visible" class="gantt-overlay" @keydown.escape="close" tabindex="0" ref="overlayRef"
      @click.self="close">
      <div class="gantt-panel">
        <!-- 顶栏 -->
        <div class="gantt-topbar">
          <div class="gantt-topbar-left">
            <span class="gantt-logo">📊</span>
            <span class="gantt-title">计划甘特表</span>
            <span class="gantt-count" v-if="notesWithPlan.length">{{ notesWithPlan.length }} 条计划</span>
            <span class="gantt-count empty" v-else>暂无计划笔记</span>
          </div>
          <div class="gantt-topbar-right">
            <button class="gantt-btn" :class="{ active: zoom === 'week' }" @click="zoom = 'week'">周</button>
            <button class="gantt-btn" :class="{ active: zoom === 'month' }" @click="zoom = 'month'">月</button>
            <button class="gantt-btn" :class="{ active: zoom === 'year' }" @click="zoom = 'year'">年</button>
            <button class="gantt-btn gantt-btn-close" @click="close" title="关闭 (Esc)">✕</button>
          </div>
        </div>

        <!-- 空态 -->
        <div v-if="notesWithPlan.length === 0" class="gantt-empty">
          <p>还没有计划笔记</p>
          <p class="gantt-empty-hint">在编辑器中开启「📅 设为计划」即可为笔记设定起止日期</p>
        </div>

        <!-- 甘特图主体 -->
        <div v-else class="gantt-body">
          <!-- 左侧标签列 -->
          <div class="gantt-labels" ref="labelsRef" @scroll="syncLabelsScroll">
            <div class="gantt-labels-header">笔记</div>
            <template v-for="g in groups" :key="g.id">
              <div class="gantt-group-label" @click="toggleCollapse(g.id)">
                <span class="gantt-group-arrow" :class="{ collapsed: isCollapsed(g.id) }">▾</span>
                {{ g.name || '未分类' }}
                <span class="gantt-group-count">{{ g.notes.length }}</span>
              </div>
              <div v-for="n in g.notes" :key="n.id" v-show="!isCollapsed(g.id)"
                class="gantt-task-label"
                :class="{ active: store.editingNote?.id === n.id, dragging: dragReorder?.id === n.id }"
                draggable="true"
                @dragstart="onReorderStart($event, n, g.id)"
                @dragover.prevent="onReorderOver($event, n, g.id)"
                @dragend="onReorderEnd"
                @click="openNote(n)">
                <span class="gantt-drag-handle" title="拖拽排序">⠿</span>
                <span class="gantt-task-dot" :style="{ background: barColor(n) }"></span>
                <span class="gantt-task-text">{{ n.title || '无标题' }}</span>
                <span class="gantt-task-pct" v-if="n.plan.progress > 0">{{ n.plan.progress }}%</span>
              </div>
            </template>
          </div>

          <!-- 右侧时间轴区域 (水平滚动) -->
          <div class="gantt-scroll" ref="scrollRef" @scroll="syncTimelineScroll">
            <div class="gantt-timeline" :style="{ width: timelineWidth + 'px' }">
              <!-- 日期表头: 年视图 (按月均匀) / 周月视图 (按天) -->
              <template v-if="zoom === 'year'">
                <div class="gantt-head-year-row">
                  <div v-for="m in monthSlots" :key="m.key"
                    class="gantt-head-year-cell"
                    :style="{ width: m.px + 'px' }">
                    {{ m.year }}年 {{ m.month }}月
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="gantt-head-row" ref="headRowRef">
                  <div v-for="d in days" :key="d.key"
                    class="gantt-head-cell"
                    :class="{ weekend: d.isWeekend, today: d.isToday }"
                    :style="{ width: dayW + 'px' }">
                    <div v-if="d.showYear" class="gantt-head-year">{{ d.year }}</div>
                    <div class="gantt-head-weekday">{{ d.weekday }}</div>
                    <div class="gantt-head-date">{{ d.month }}/{{ d.day }}</div>
                  </div>
                </div>
              </template>

              <!-- 今日线 -->
              <div class="gantt-today" :style="{ left: todayLeft + 'px' }"></div>

              <!-- 泳道 -->
              <div class="gantt-lanes">
                <template v-for="g in groups" :key="g.id">
                  <div class="gantt-lane-header-row" v-show="!isCollapsed(g.id)"></div>
                  <div v-for="n in g.notes" :key="n.id" v-show="!isCollapsed(g.id)"
                    class="gantt-lane-row"
                    :class="{ active: store.editingNote?.id === n.id }"
                    @click="openNote(n)">
                    <!-- 横条 -->
                    <div class="gantt-bar"
                      :style="barStyle(n)"
                      :title="n.title + ' (' + n.plan.start + ' → ' + n.plan.end + ', ' + n.plan.progress + '%)'">
                      <!-- 左侧拖拽柄 -->
                      <div class="gantt-bar-resize gantt-bar-resize-l"
                        @mousedown.stop.prevent="startDrag($event, n, 'resize-l')"></div>
                      <!-- 中间拖拽 -->
                      <div class="gantt-bar-body"
                        @mousedown.stop.prevent="startDrag($event, n, 'move')"></div>
                      <!-- 进度条 -->
                      <span class="gantt-bar-progress" :style="{ width: (n.plan.progress || 0) + '%' }"></span>
                      <!-- 标题 -->
                      <span v-if="barWidthPx(n) > 50" class="gantt-bar-text">{{ n.title }}</span>
                      <!-- 右侧拖拽柄 -->
                      <div class="gantt-bar-resize gantt-bar-resize-r"
                        @mousedown.stop.prevent="startDrag($event, n, 'resize-r')"></div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, shallowRef } from 'vue';
import { store } from '@/store';
import { features } from '@/store/features.js';
import { getPlan, parseDate, fmtDate, daysBetween, chineseWeekday } from '@/utils/gantt-parser.js';
import API from '@/api/index.js';

const props = defineProps({
  visible: { type: Boolean, default: false }
});
const emit = defineEmits(['close']);

const zoom = ref('week');
const scrollRef = ref(null);
const labelsRef = ref(null);
const headRowRef = ref(null);
const overlayRef = ref(null);
const dayW = computed(() => {
  if (zoom.value === 'week') return 44;
  if (zoom.value === 'month') return 22;
  return 10; // 年视图
});

// 获取某月天数 (1=1月)
function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

// ===== 折叠状态 =====
const collapsedCats = ref(new Set());
function isCollapsed(gid) { return collapsedCats.value.has(gid); }
function toggleCollapse(gid) {
  const s = new Set(collapsedCats.value);
  if (s.has(gid)) s.delete(gid); else s.add(gid);
  collapsedCats.value = s;
}

// ===== 从 store 提取有计划的所有笔记 (读取 note.planData 字段) =====
const notesWithPlan = computed(() => {
  return (store.notes || []).filter(n => {
    const plan = getPlan(n);
    return plan && parseDate(plan.start) && parseDate(plan.end);
  }).map(n => ({ ...n, plan: getPlan(n) }));
});

// ===== 确定时间轴范围 =====
const dateRange = computed(() => {
  const items = notesWithPlan.value;
  if (!items.length) return { start: new Date(), end: new Date() };
  let min = null, max = null;
  for (const n of items) {
    const s = parseDate(n.plan.start);
    const e = parseDate(n.plan.end);
    if (s && (!min || s < min)) min = new Date(s);
    if (e && (!max || e > max)) max = new Date(e);
  }
  if (!min) min = new Date();
  if (!max) max = new Date();
  min.setDate(min.getDate() - 7);
  max.setDate(max.getDate() + 7);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (min > today) min = new Date(+today - 7 * 86400000);
  if (max < today) max = new Date(+today + 7 * 86400000);
  return { start: min, end: max };
});

// ===== 日期列 (含年份标记) =====
const days = computed(() => {
  const { start, end } = dateRange.value;
  const list = [];
  const cur = new Date(start);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let prevYear = null;
  while (cur <= end) {
    const d = new Date(cur);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const showYear = y !== prevYear;
    prevYear = y;
    list.push({
      key: fmtDate(d),
      year: y,
      showYear,
      month: m,
      day: d.getDate(),
      weekday: '周' + chineseWeekday(d),
      date: d,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday: +d === +today
    });
    cur.setDate(cur.getDate() + 1);
  }
  return list;
});
const timelineWidth = computed(() => days.value.length * dayW.value);
const dayZero = computed(() => dateRange.value.start);

// ===== 月跨度 (年视图用, 每个月的像素宽度 = 该月天数 * dayW) =====
const monthSlots = computed(() => {
  const { start, end } = dateRange.value;
  const list = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    const days = daysInMonth(y, m);
    list.push({
      key: `${y}-${String(m).padStart(2, '0')}`,
      year: y,
      month: m,
      days,
      px: days * dayW.value
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return list;
});
const todayLeft = computed(() => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return daysBetween(dayZero.value, t) * dayW.value;
});

// ===== 按分类分组 =====
const groups = computed(() => {
  const map = {};
  const catMap = {};
  for (const c of (store.categories || [])) catMap[c.id] = c;
  for (const n of notesWithPlan.value) {
    const cid = (n.category_ids && n.category_ids[0]) || null;
    const cat = cid != null ? catMap[cid] : null;
    const gid = cat ? cat.id : '__none__';
    if (!map[gid]) map[gid] = { id: gid, name: cat ? cat.name : '未分类', color: cat ? cat.color : '#999', notes: [] };
    map[gid].notes.push(n);
  }
  return Object.values(map);
});

// ===== 颜色 =====
function barColor(note) {
  if (note.plan.color) return note.plan.color;
  const cid = (note.category_ids && note.category_ids[0]) || null;
  if (cid == null) return '#999';
  const cat = (store.categories || []).find(c => c.id === cid);
  return cat ? (cat.color || '#6366f1') : '#6366f1';
}

// ===== 横条定位 =====
function barStyle(note) {
  const start = parseDate(note.plan.start);
  const end = parseDate(note.plan.end);
  if (!start || !end) return { display: 'none' };
  const offset = daysBetween(dayZero.value, start);
  const w = daysBetween(start, end) + 1;
  return {
    left: (offset * dayW.value) + 'px',
    width: Math.max(w * dayW.value - 2, 4) + 'px',
    backgroundColor: barColor(note)
  };
}
function barWidthPx(note) {
  const s = parseDate(note.plan.start);
  const e = parseDate(note.plan.end);
  if (!s || !e) return 0;
  return (daysBetween(s, e) + 1) * dayW.value;
}

// ===== 拖拽: 重排顺序 =====
const dragReorder = ref(null); // { id, fromGroup, lastOverId }
function onReorderStart(e, note, gid) {
  dragReorder.value = { id: note.id, fromGroup: gid, lastOverId: null };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
}
function onReorderOver(e, note, gid) {
  if (!dragReorder.value || dragReorder.value.id === note.id) return;
  // 避免同一目标重复重排 (dragover 高频触发)
  if (dragReorder.value.lastOverId === note.id) return;
  dragReorder.value.lastOverId = note.id;
  const fromIdx = store.notes.findIndex(n => n.id === dragReorder.value.id);
  const toIdx = store.notes.findIndex(n => n.id === note.id);
  if (fromIdx < 0 || toIdx < 0) return;
  const sorted = [...store.notes];
  const [moved] = sorted.splice(fromIdx, 1);
  const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
  sorted.splice(insertAt, 0, moved);
  sorted.forEach((n, i) => { n.position = i; });
  store.notes = sorted;
  store.noteListVersion = Date.now();
}
function onReorderEnd() {
  if (dragReorder.value) {
    API.reorderNotes(store.notes.map(n => n.id)).catch(() => {});
  }
  dragReorder.value = null;
}

// ===== 拖拽: 调整日期 (resize / move) =====
const dragDate = ref(null); // { noteId, type, startX, origStart, origEnd, start, end }
const localNotes = shallowRef(null); // 用于拖拽中的乐观更新

function startDrag(e, note, type) {
  const origStart = parseDate(note.plan.start);
  const origEnd = parseDate(note.plan.end);
  if (!origStart || !origEnd) return;
  dragDate.value = {
    noteId: note.id,
    type,
    startX: e.clientX,
    origStart: new Date(origStart),
    origEnd: new Date(origEnd)
  };
  document.addEventListener('mousemove', onDragDateMove);
  document.addEventListener('mouseup', onDragDateEnd);
}

function onDragDateMove(e) {
  if (!dragDate.value) return;
  const dd = dragDate.value;
  const dx = e.clientX - dd.startX;
  const daysDelta = Math.round(dx / dayW.value);
  if (daysDelta === 0) return;

  // 找到 notesWithPlan 中对应的笔记并乐观更新
  const allNotes = notesWithPlan.value;
  const note = allNotes.find(n => n.id === dd.noteId);
  if (!note) return;

  let newStart = new Date(dd.origStart);
  let newEnd = new Date(dd.origEnd);
  if (dd.type === 'resize-l') {
    newStart.setDate(newStart.getDate() + daysDelta);
    if (newStart >= newEnd) return;
  } else if (dd.type === 'resize-r') {
    newEnd.setDate(newEnd.getDate() + daysDelta);
    if (newEnd <= newStart) return;
  } else {
    newStart.setDate(newStart.getDate() + daysDelta);
    newEnd.setDate(newEnd.getDate() + daysDelta);
  }
  note.plan.start = fmtDate(newStart);
  note.plan.end = fmtDate(newEnd);
  // Force reactive update by triggering a new array
  const idx = allNotes.indexOf(note);
  if (idx >= 0) allNotes[idx] = { ...note };
}

async function onDragDateEnd() {
  document.removeEventListener('mousemove', onDragDateMove);
  document.removeEventListener('mouseup', onDragDateEnd);
  if (!dragDate.value) return;
  const dd = dragDate.value;
  const note = notesWithPlan.value.find(n => n.id === dd.noteId);
  if (note) {
    const origNote = store.notes.find(n => n.id === dd.noteId);
    if (origNote) {
      const planData = {
        start: note.plan.start,
        end: note.plan.end,
        progress: note.plan.progress,
        color: note.plan.color || undefined
      };
      try {
        await API.updateNote(dd.noteId, { planData });
        origNote.planData = planData;
      } catch (e) {
        console.warn('保存计划日期失败:', e);
      }
    }
  }
  dragDate.value = null;
}

// ===== 同步左右滚动 =====
let syncing = false;
function syncLabelsScroll() {
  if (syncing || !scrollRef.value) return;
  syncing = true;
  scrollRef.value.scrollTop = labelsRef.value.scrollTop;
  syncing = false;
}
function syncTimelineScroll() {
  if (syncing || !labelsRef.value) return;
  syncing = true;
  labelsRef.value.scrollTop = scrollRef.value.scrollTop;
  syncing = false;
}

// ===== 打开笔记 =====
function openNote(note) { store.openNote(note); }
function close() { emit('close'); }

// ===== 键盘 =====
function onKeydown(e) {
  if (e.key === 'Escape' && props.visible) close();
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  nextTick(() => overlayRef.value?.focus());
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
/* ===== 覆盖层 ===== */
.gantt-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
  animation: ganttFadeIn .2s ease;
}
@keyframes ganttFadeIn { from { opacity: 0; } to { opacity: 1; } }
.gantt-panel {
  width: 100%; max-width: 1200px; height: 85vh;
  background: var(--bg-elevated,#fff); border-radius: 14px;
  box-shadow: 0 16px 64px rgba(0,0,0,0.25);
  display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid var(--border-default);
}

/* ===== 顶栏 ===== */
.gantt-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border-default);
  flex-shrink: 0; background: var(--bg-panel);
}
.gantt-topbar-left { display: flex; align-items: center; gap: 10px; }
.gantt-logo { font-size: 18px; line-height: 1; }
.gantt-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.gantt-count {
  font-size: 12px; color: var(--text-tertiary);
  padding: 2px 8px; background: var(--bg-hover); border-radius: 10px;
}
.gantt-count.empty { color: var(--text-disabled); }
.gantt-topbar-right { display: flex; align-items: center; gap: 6px; }
.gantt-btn {
  padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 6px;
  border: 1px solid var(--border-default); background: transparent;
  color: var(--text-secondary); cursor: pointer; transition: all .12s;
  white-space: nowrap; flex-shrink: 0;
}
.gantt-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.gantt-btn.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.gantt-btn-close {
  border: none; font-size: 16px; width: 30px; height: 30px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; margin-left: 8px;
}

/* ===== 空态 ===== */
.gantt-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  color: var(--text-tertiary); font-size: 14px;
}
.gantt-empty-hint { font-size: 12px; color: var(--text-disabled); }

/* ===== 主体 ===== */
.gantt-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }

/* ===== 左侧标签列 ===== */
.gantt-labels {
  flex-shrink: 0; width: 210px; overflow-y: auto; overflow-x: hidden;
  border-right: 1px solid var(--border-default); background: var(--bg-panel);
}
.gantt-labels::-webkit-scrollbar { width: 4px; }
.gantt-labels-header {
  height: 44px; display: flex; align-items: center; padding: 0 12px;
  font-size: 11px; font-weight: 600; color: var(--text-tertiary);
  letter-spacing: .5px; border-bottom: 1px solid var(--border-subtle);
}
.gantt-group-label {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; font-size: 11px; font-weight: 700;
  color: var(--text-secondary); background: var(--bg-hover);
  border-bottom: 1px solid var(--border-subtle); cursor: pointer;
  user-select: none;
}
.gantt-group-label:hover { background: var(--border-default); }
.gantt-group-arrow {
  font-size: 8px; transition: transform .15s; display: inline-block;
}
.gantt-group-arrow.collapsed { transform: rotate(-90deg); }
.gantt-group-count {
  margin-left: auto; font-size: 10px; font-weight: 400;
  color: var(--text-tertiary); background: var(--bg-panel);
  padding: 0 6px; border-radius: 8px; line-height: 16px;
}
.gantt-task-label {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 8px; font-size: 12px; color: var(--text-primary);
  cursor: pointer; border-bottom: 1px solid var(--border-subtle);
  transition: background .1s; min-height: 34px;
}
.gantt-task-label:hover { background: var(--bg-hover); }
.gantt-task-label.active { background: var(--color-primary-subtle); color: var(--color-primary); font-weight: 600; }
.gantt-task-label.dragging { opacity: 0.4; }
.gantt-drag-handle {
  cursor: grab; color: var(--text-tertiary); font-size: 11px;
  line-height: 1; padding: 0 2px; flex-shrink: 0; user-select: none;
}
.gantt-drag-handle:active { cursor: grabbing; }
.gantt-task-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.gantt-task-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.gantt-task-pct {
  font-size: 9px; color: var(--text-tertiary);
  background: var(--bg-hover); padding: 0 5px; border-radius: 6px;
  line-height: 16px; font-variant-numeric: tabular-nums;
}

/* ===== 右侧滚动 ===== */
.gantt-scroll { flex: 1; overflow: auto; position: relative; }
.gantt-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.gantt-scroll::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
.gantt-timeline { position: relative; min-height: 100%; }

/* ===== 日期表头 ===== */
.gantt-head-row {
  display: flex; height: 44px; border-bottom: 1px solid var(--border-subtle);
  position: sticky; top: 0; z-index: 2; background: var(--bg-elevated);
}
.gantt-head-cell {
  flex-shrink: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border-right: 1px solid var(--border-subtle);
  font-size: 10px; line-height: 1.3; color: var(--text-tertiary);
}
.gantt-head-cell.weekend { background: var(--bg-hover); }
.gantt-head-cell.today {
  background: var(--color-accent-subtle,rgba(91,110,245,0.08));
  color: var(--color-accent); font-weight: 700;
}
.gantt-head-year {
  font-size: 9px; font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1px;
}
.gantt-head-cell.year-start { border-left: 2px solid var(--border-default); }
.gantt-head-weekday { font-size: 9px; }
.gantt-head-date { font-size: 11px; }
/* 年视图月份表头 */
.gantt-head-year-row {
  display: flex; height: 44px;
  border-bottom: 1px solid var(--border-subtle);
  position: sticky; top: 0; z-index: 2; background: var(--bg-elevated);
}
.gantt-head-year-cell {
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--text-primary);
  border-right: 1px solid var(--border-subtle);
  white-space: nowrap; overflow: hidden;
}

/* ===== 泳道 ===== */
.gantt-lanes { position: relative; }
.gantt-lane-header-row { height: 26px; border-bottom: 1px solid var(--border-subtle); }
.gantt-lane-row {
  position: relative; height: 34px; border-bottom: 1px solid var(--border-subtle);
  cursor: pointer; transition: background .1s;
}
.gantt-lane-row:hover { background: var(--bg-hover); }
.gantt-lane-row.active { background: var(--color-primary-subtle); }

/* ===== 横条 ===== */
.gantt-bar {
  position: absolute; top: 4px; bottom: 4px; border-radius: 4px;
  display: flex; align-items: center; overflow: visible; cursor: default;
  opacity: 0.85; min-width: 4px;
}
.gantt-lane-row:hover .gantt-bar { opacity: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.18); }
.gantt-bar-body {
  position: absolute; inset: 0; cursor: grab; border-radius: 4px; z-index: 2;
}
.gantt-bar-body:active { cursor: grabbing; }
.gantt-bar-text {
  font-size: 10px; font-weight: 600; color: #fff; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; position: relative;
  z-index: 1; padding: 0 4px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.25);
}
.gantt-bar-progress {
  position: absolute; inset: 0; background: rgba(255,255,255,0.2);
  border-radius: 4px; transition: width .2s; z-index: 0;
}
.gantt-bar-resize {
  position: absolute; top: 0; bottom: 0; width: 6px; z-index: 3;
  cursor: col-resize; background: transparent;
}
.gantt-bar-resize:hover { background: rgba(255,255,255,0.3); }
.gantt-bar-resize-l { left: 0; border-radius: 4px 0 0 4px; }
.gantt-bar-resize-r { right: 0; border-radius: 0 4px 4px 0; }

/* ===== 今日线 ===== */
.gantt-today {
  position: absolute; top: 0; bottom: 0; width: 2px;
  background: #ef4444; z-index: 3; pointer-events: none;
}
.gantt-today::before {
  content: '今天'; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  font-size: 8px; font-weight: 700; color: #ef4444;
  background: var(--bg-elevated); padding: 0 4px;
  border-radius: 0 0 3px 3px; line-height: 14px; white-space: nowrap;
}

/* ===== 暗色适配 ===== */
:global([data-theme="dark"]) .gantt-panel { border-color: var(--border-default); box-shadow: 0 16px 64px rgba(0,0,0,0.5); }
:global([data-theme="dark"]) .gantt-bar-text { text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
</style>
