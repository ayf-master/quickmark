// SM-2 间隔重复算法 — 纯函数, 无副作用, 便于单测
// 参考 Anki / SuperMemo 内核。每次复习给 quality(0-5), 算出下一张卡的状态。
const MIN_EF = 1.3;

/**
 * @param {{easeFactor:number, interval:number, reps:number}} card 当前卡状态
 * @param {number} quality 评分 0-5 (0-2 失败, 3 Hard, 4 Good, 5 Easy)
 * @returns {{easeFactor:number, interval:number, reps:number, dueInDays:number}}
 */
function gradeCard(card, quality) {
  let { easeFactor, interval, reps } = card;

  // 失败: 重置进度, 明天再练 (EF 不变, 难度记忆保留)
  if (quality < 3) {
    return { easeFactor, interval: 1, reps: 0, dueInDays: 1 };
  }

  // 成功: 按规则推下一次间隔
  if (reps === 0) {
    interval = 1;
  } else if (reps === 1) {
    interval = 6;
  } else {
    interval = Math.round(interval * easeFactor);
  }
  reps += 1;

  // 更新难度系数 EF (公式来自 SM-2 原始论文)
  easeFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  if (easeFactor < MIN_EF) easeFactor = MIN_EF;

  return { easeFactor, interval, reps, dueInDays: interval };
}

module.exports = { gradeCard, MIN_EF };
