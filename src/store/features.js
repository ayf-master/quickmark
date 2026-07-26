// QuickMark - 功能开关状态 (reactive 单例)
// 配合右上角「扩展功能」面板: 默认全关, 用户按需开启。
// 设计: 状态驱动 UI (v-if 条件渲染), 切换零刷新; 变更经 debounce 持久化到后端 User.settings。
import { reactive } from 'vue';
import API from '@/api/index.js';

// 已知功能键 (与后端 KNOWN_FEATURES 白名单对应)
export const KNOWN_FEATURES = ['spacedRepetition', 'canvas', 'learningPath'];

export const features = reactive({
  spacedRepetition: false,
  canvas: false,
  learningPath: false
});

let saveTimer = null;

// 登录后调用: 从后端拉取开关状态, 重置后再应用 (避免残留上一个用户的状态)
export async function initFeatures() {
  for (const k of KNOWN_FEATURES) features[k] = false;
  try {
    const data = await API.getSettings();
    const f = (data && data.features) || {};
    for (const k of KNOWN_FEATURES) {
      if (typeof f[k] === 'boolean') features[k] = f[k];
    }
  } catch (e) {
    // 离线 / 未登录 / 列还没迁移: 保留默认 false, 开关仍可在内存中演示
    console.warn('initFeatures 失败, 用默认:', e);
  }
}

// 登出时调用: 清空, 避免下一个用户看到上一个用户的开关
export function resetFeatures() {
  for (const k of KNOWN_FEATURES) features[k] = false;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
}

// 切换某个功能 (拨开关)
export function setFeature(id, val) {
  if (!KNOWN_FEATURES.includes(id)) return;
  features[id] = !!val;
  schedulePersist();
}

function schedulePersist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400); // 防快速连拨刷接口
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
