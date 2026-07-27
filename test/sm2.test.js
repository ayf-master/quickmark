// SM-2 算法最小单测 — 运行: node test/sm2.test.js
const assert = require('assert');
const { gradeCard, MIN_EF } = require('../prisma/sm2');

// 1) 新卡连续 Good(4): 间隔应为 1 -> 6 -> 15
let c = { easeFactor: 2.5, interval: 0, reps: 0 };
let r1 = gradeCard(c, 4);
assert.strictEqual(r1.interval, 1, '第1次应为 1 天');
assert.strictEqual(r1.reps, 1);

let r2 = gradeCard({ easeFactor: r1.easeFactor, interval: r1.interval, reps: r1.reps }, 4);
assert.strictEqual(r2.interval, 6, '第2次应为 6 天');
assert.strictEqual(r2.reps, 2);

let r3 = gradeCard({ easeFactor: r2.easeFactor, interval: r2.interval, reps: r2.reps }, 4);
assert.strictEqual(r3.interval, 15, '第3次应为 15 天');
assert.strictEqual(r3.reps, 3);

// 2) 中途 Again(2): reps 归零, interval=1, EF 不变
let fail = gradeCard({ easeFactor: 2.5, interval: 15, reps: 5 }, 2);
assert.strictEqual(fail.reps, 0, '失败应重置 reps');
assert.strictEqual(fail.interval, 1, '失败间隔应为 1 天');
assert.strictEqual(fail.easeFactor, 2.5, '失败 EF 应保留');

// 3) EF 不会低于 1.3
let low = gradeCard({ easeFactor: 1.3, interval: 1, reps: 0 }, 0);
assert.ok(low.easeFactor >= MIN_EF, 'EF 不应低于下限 1.3');

// 4) Easy(5) 比 Good(4) 推得更远 (EF 增大)
let good = gradeCard({ easeFactor: 2.5, interval: 6, reps: 1 }, 4);
let easy = gradeCard({ easeFactor: 2.5, interval: 6, reps: 1 }, 5);
assert.ok(easy.easeFactor > good.easeFactor, 'Easy 应提升更多 EF');

console.log('SM-2 单测全部通过 ✅');
