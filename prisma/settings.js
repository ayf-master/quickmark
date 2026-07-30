/**
 * prisma/settings.js — 用户设置读写 (User.settings JSON 列)
 *
 * 用途: 存功能开关等用户偏好, 例如 { features: { spacedRepetition: true } }
 * 设计:
 *   - 仅接受白名单内的 features 键, 防脏数据 / 越权写未知键
 *   - normalize / merge 为纯函数, 同时供 Prisma 模式与 pool 模式复用
 *   - 列不存在 (迁移还没跑) 时, 上层路由会 catch 降级, 不阻塞前端
 */
const KNOWN_FEATURES = ['spacedRepetition', 'canvas', 'ganttChart'];

/** 把任意输入规整成 { features: {...} }, 未知键丢弃 */
function normalizeSettings(raw) {
  if (raw == null) return { features: {} };
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return { features: {} }; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { features: {} };
  const features = {};
  if (obj.features && typeof obj.features === 'object') {
    for (const k of KNOWN_FEATURES) {
      if (typeof obj.features[k] === 'boolean') features[k] = obj.features[k];
    }
  }
  return { features };
}

/** 合并: 以 current 为底, 用 incoming.features 覆盖已知键 */
function mergeSettings(current, incoming) {
  const cur = normalizeSettings(current);
  const incomingFeatures = (incoming && incoming.features && typeof incoming.features === 'object')
    ? incoming.features : {};
  const features = { ...cur.features };
  for (const k of KNOWN_FEATURES) {
    if (typeof incomingFeatures[k] === 'boolean') features[k] = incomingFeatures[k];
  }
  return { features };
}

async function getSettings(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true }
  });
  return normalizeSettings(user ? user.settings : null);
}

async function setSettings(userId, incoming, prisma) {
  const merged = mergeSettings(await getSettings(userId, prisma), incoming);
  await prisma.user.update({
    where: { id: userId },
    data: { settings: merged }
  });
  return merged;
}

module.exports = { getSettings, setSettings, normalizeSettings, mergeSettings, KNOWN_FEATURES };
