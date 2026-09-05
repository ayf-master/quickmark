// 间隔重复 — 简化版: 按遗忘曲线提醒用户复习笔记
// 核心: SM-2 算法调度, 到期笔记在列表高亮, 用户阅读后标记已复习
// 不再有 [[quiz]] 解析 / 自测卡 / Q&A 评分界面

const { gradeCard } = require('./sm2');

// 今天 23:59:59.999 — 取今日队列的 due 上界
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// 本地日期字符串 YYYY-MM-DD
function dateToStr(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 连续打卡 streak
async function bumpStreak(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reviewStreak: true, lastReviewDate: true }
  });
  const today = dateToStr(new Date());
  const prev = user?.lastReviewDate ? dateToStr(user.lastReviewDate) : null;
  let streak = user?.reviewStreak || 0;
  if (prev !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = dateToStr(y);
    streak = prev === yStr ? streak + 1 : 1;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { reviewStreak: streak, lastReviewDate: new Date() }
  });
  return streak;
}

// 新卡首次到期天数: 与 sm2.js 中 reps=0 的首次间隔保持一致 (1 天)
// 用 gradeCard 推导而不是写死, 以后改 SM-2 参数时这里会自动跟随, 不会脱节
const NEW_CARD_DUE_DAYS = gradeCard({ easeFactor: 2.5, interval: 0, reps: 0 }, 4).dueInDays;

// 注册复习: 为一篇笔记建一张 ReviewCard (已有则忽略)
async function enrollNote(userId, noteId, prisma) {
  const nid = parseInt(noteId);
  const note = await prisma.note.findFirst({ where: { id: nid, userId } });
  if (!note) return { error: 'not_found' };
  const existing = await prisma.reviewCard.findFirst({ where: { noteId: nid, userId } });
  if (existing) return { card: existing, created: false };
  // 新卡按 SM-2 首次间隔 (1 天后) 安排, 让记忆先沉淀一天
  // 原实现 dueDate: new Date() 会让刚创建的笔记立刻出现在"到期复习"里
  const due = new Date();
  due.setDate(due.getDate() + NEW_CARD_DUE_DAYS);
  const card = await prisma.reviewCard.create({
    data: { noteId: nid, userId, dueDate: due }
  });
  return { card, created: true };
}

// 批量注册: 为用户所有笔记建复习卡
async function enrollAll(userId, prisma) {
  const notes = await prisma.note.findMany({
    where: { userId },
    select: { id: true }
  });
  let created = 0;
  for (const n of notes) {
    const r = await enrollNote(userId, n.id, prisma);
    if (r.created) created += 1;
  }
  return { created };
}

// 获取今日到期笔记列表 (仅返回 noteId + title)
async function getDueNotes(userId, prisma) {
  const cards = await prisma.reviewCard.findMany({
    where: { userId, dueDate: { lte: endOfToday() } },
    orderBy: { dueDate: 'asc' },
    include: { note: { select: { id: true, title: true, mastery: true } } }
  });
  return cards.map(c => ({
    cardId: c.id,
    noteId: c.noteId,
    title: c.note.title || '未命名笔记',
    mastery: c.note.mastery ?? 0,
    dueDate: c.dueDate
  }));
}

// 标记一篇笔记为"已复习" (使用 SM-2, quality=4 表示"记得")
async function markReviewed(userId, cardId, prisma) {
  const cid = parseInt(cardId);
  const card = await prisma.reviewCard.findFirst({ where: { id: cid, userId } });
  if (!card) return { error: 'not_found' };

  // quality=4 (Good), 表示用户阅读后记住了内容
  const res = gradeCard(
    { easeFactor: card.easeFactor, interval: card.interval, reps: card.reps },
    4
  );

  const due = new Date();
  due.setDate(due.getDate() + res.dueInDays);

  await prisma.reviewCard.update({
    where: { id: cid },
    data: {
      easeFactor: res.easeFactor,
      interval: res.interval,
      reps: res.reps,
      dueDate: due,
      lastReviewedAt: new Date()
    }
  });

  // 掌握度 0-5
  const mastery = Math.max(0, Math.min(5, res.reps + (res.interval >= 15 ? 1 : 0)));
  await prisma.note.update({ where: { id: card.noteId }, data: { mastery } });

  const streak = await bumpStreak(userId, prisma);
  return { card: { id: cid }, mastery, streak, nextDue: due };
}

// 复习统计
async function getStats(userId, prisma) {
  const [due, total, mastered, user] = await Promise.all([
    prisma.reviewCard.count({ where: { userId, dueDate: { lte: endOfToday() } } }),
    prisma.reviewCard.count({ where: { userId } }),
    prisma.note.count({ where: { userId, mastery: { gte: 4 } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { reviewStreak: true } })
  ]);
  return {
    dueToday: due,
    totalCards: total,
    masteredCount: mastered,
    streak: user?.reviewStreak || 0
  };
}

module.exports = { enrollNote, enrollAll, getDueNotes, markReviewed, getStats };
