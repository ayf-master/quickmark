// QuickMark - 功能开关状态 + 插槽注册表 (reactive 单例)
//
// 设计:
//   1. 开关状态响应式存储, 切换零刷新
//   2. 变更经 debounce 持久化到后端 User.settings
//   3. slotRegistry 按 slot 名聚合已开启功能的组件, 供 ExtensionSlot 消费
//   4. mount/unmount 返回 Promise, 调用方可 await 确认完成

import { reactive, shallowRef, computed } from 'vue';
import API from '@/api/index.js';
import { featuresManifest } from '@/featureManifest.js';

// 已知功能键 (与后端 KNOWN_FEATURES 白名单对应)
export const KNOWN_FEATURES = ['spacedRepetition', 'canvas', 'ganttChart'];

// 开关状态 (reactive)
export const features = reactive({
  spacedRepetition: false,
  canvas: false,
  learningPath: false,

  // ===== 间隔重复：到期笔记共享状态 =====
  /** 到期笔记 id 集合 (供 NoteList 高亮) */
  dueNoteIds: [],          // 用数组代替 Set 以保持 reactive
  /** noteId → cardId 映射 (供 NoteEditor 标记已复习) */
  dueCardMap: {},
  /** 到期总数 (供 AppHeader badge) */
  dueCount: 0,
});

// ===== 插槽注册表 =====
// 每个槽位名 → shallowRef(组件定义), 供 ExtensionSlot 用 :is 渲染
// shallowRef 避免包裹异步组件时的不必要深度响应
const _slotEntries = reactive({});
/** 按 slot 名取当前活跃组件列表 (供 ExtensionSlot.vue 消费) */
export function getSlotComponents(slotName) {
  const entries = _slotEntries[slotName];
  if (!entries) return [];
  return entries.map(e => e.component);
}
/** 取某 slot 中第一个活跃组件的 props (合并传参) */
export function getSlotProps(slotName) {
  const entries = _slotEntries[slotName];
  if (!entries) return {};
  const merged = {};
  for (const e of entries) {
    if (e.props) Object.assign(merged, e.props);
  }
  return merged;
}
/** 检查某 slot 是否有活跃组件 */
export function hasSlotContent(slotName) {
  const entries = _slotEntries[slotName];
  return !!entries && entries.length > 0;
}

// ===== 插槽管理 (内部) =====

function rebuildSlotRegistry() {
  // 清空 (保留引用)
  for (const k of Object.keys(_slotEntries)) delete _slotEntries[k];
  // 遍历 manifest, 把已开启的塞入对应 slot
  for (const f of featuresManifest) {
    if (features[f.id] && f.available) {
      const slot = f.slot || 'drawer';
      if (!_slotEntries[slot]) _slotEntries[slot] = [];
      _slotEntries[slot].push({
        id: f.id,
        component: f.component,
        props: f.props || {}
      });
    }
  }
}

// ===== 持久化 =====

let saveTimer = null;

// 登录后调用: 从后端拉取开关状态
export async function initFeatures() {
  for (const k of KNOWN_FEATURES) features[k] = false;
  try {
    const data = await API.getSettings();
    const f = (data && data.features) || {};
    for (const k of KNOWN_FEATURES) {
      if (typeof f[k] === 'boolean') features[k] = f[k];
    }
  } catch (e) {
    console.warn('initFeatures 失败, 用默认:', e);
  }
  rebuildSlotRegistry();
}

// 登出时调用: 清空
export function resetFeatures() {
  for (const k of KNOWN_FEATURES) features[k] = false;
  features.dueNoteIds = [];
  features.dueCardMap = {};
  features.dueCount = 0;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  rebuildSlotRegistry();
}

// 切换某个功能 (拨开关 + 即时更新插槽)
export function setFeature(id, val) {
  if (!KNOWN_FEATURES.includes(id)) return;
  features[id] = !!val;
  rebuildSlotRegistry();  // 即时刷新插槽, 组件立即渲染/卸载
  schedulePersist();
}

// 立即持久化 (绕过 debounce)
export async function flushFeatures() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  await persist();
}

function schedulePersist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}

async function persist() {
  try {
    const snapshot = {};
    for (const k of KNOWN_FEATURES) snapshot[k] = features[k];
    await API.updateSettings({ features: snapshot });
  } catch (e) {
    console.warn('persist features 失败:', e);
  }
}

// ===== 间隔重复：共享到期笔记状态 =====

/** 从后端拉取到期笔记，更新共享状态 (供 NoteList / AppHeader / NoteEditor 共用) */
export async function refreshDueNotes() {
  if (!features.spacedRepetition) {
    features.dueNoteIds = [];
    features.dueCardMap = {};
    features.dueCount = 0;
    return;
  }
  try {
    const data = await API.getDueNotes();
    if (data && data.due) {
      features.dueNoteIds = data.due.map(n => n.noteId);
      const m = {};
      for (const n of data.due) m[n.noteId] = n.cardId;
      features.dueCardMap = m;
      features.dueCount = data.count || data.due.length;
    } else {
      features.dueNoteIds = [];
      features.dueCardMap = {};
      features.dueCount = 0;
    }
  } catch (e) {
    features.dueNoteIds = [];
    features.dueCardMap = {};
    features.dueCount = 0;
  }
}

/** 标记已复习后从共享状态中移除 (立即消除高亮) */
export function removeDueNote(noteId) {
  features.dueNoteIds = features.dueNoteIds.filter(id => id !== noteId);
  const m = { ...features.dueCardMap };
  delete m[noteId];
  features.dueCardMap = m;
  features.dueCount = Math.max(0, features.dueCount - 1);
}
