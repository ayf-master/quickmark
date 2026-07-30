/**
 * QuickMark 甘特表 — 计划数据工具
 *
 * 计划信息存于 Note.planData JSON 字段，不在笔记正文中。
 *   { start: "2026-08-01", end: "2026-08-15", progress: 60, color: "#ff6b6b" }
 *
 * - start / end: 起止日期 (YYYY-MM-DD)
 * - progress: 完成百分比 0-100
 * - color: 可选, 自定义条颜色（十六进制）, 不设则用分类色
 */

/** 从 note 对象取计划数据 (安全, 不会因 planData 格式异常而抛错) */
export function getPlan(note) {
  if (!note || !note.planData) return null;
  let d;
  try {
    d = typeof note.planData === 'string' ? JSON.parse(note.planData) : note.planData;
  } catch { return null; }
  if (!d || !d.start || !d.end) return null;
  return {
    start: d.start,
    end: d.end,
    progress: typeof d.progress === 'number' ? d.progress : 0,
    color: (d.color && /^#[0-9a-f]{6}$/i.test(d.color)) ? d.color : null
  };
}

/** 判断 note 是否有计划 */
export function hasPlan(note) {
  return !!getPlan(note);
}

// ===== 日期工具 =====

/** Date → YYYY-MM-DD */
export function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD → Date */
export function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 两日期天数差 (含头不含尾) */
export function daysBetween(a, b) {
  const ta = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const tb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((tb - ta) / 86400000);
}

/** 中文星期名 */
export function chineseWeekday(d) {
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
}
