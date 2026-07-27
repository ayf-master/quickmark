// 间隔重复 — 数据访问层
// 依赖: prisma client, sm2 算法, [[quiz]] 正则解析
// 所有查询都带 userId, 沿用项目多用户隔离规矩
const { gradeCard } = require('./sm2');

// 与前端 wiki-link.js 同思路: 从笔记内容解析 [[quiz:问题|答案]]
const QUIZ_RE = /\[\[quiz:([^\]|]+)\|([^\]]+)\]\]/g;

// 从笔记内容解析出 quiz 题目数组 (不单独存表, 内容即数据)
function parseQuizzes(content) {
  if (!content) return [];
  const out = [];
  let m;
  QUIZ_RE.lastIndex = 0;
  while ((m = QUIZ_RE.exec(content)) !== null) {
    out.push({ question: m[1].trim(), answer: m[2].trim() });
  }
  return out;
}

// 今天 23:59:59.999 — 取今日队列的 due 上界 (按日期不看时分)
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// 加入复习: 为某篇笔记建一张 ReviewCard (已有则忽略)
async function enrollNote(userId, noteId, prisma) {
  const nid = parseInt(noteId);
  const note = await prisma.note.findFirst({ where: { id: nid, userId } });
  if (!note) return { error: 'not_found' };
  const existing = await prisma.reviewCard.findFirst({ where: { noteId: nid, userId } });
  if (existing) return { card: existing, created: false };
  const card = await prisma.reviewCard.create({
    data: { noteId: nid, userId, dueDate: new Date() } // 立即进入今日队列
  });
  return { card, created: true };
}

// 今日队列: dueDate <= 今天结束 的卡, 带笔记标题 + 解析出的 quiz
async function getTodayQueue(userId, prisma) {
  const cards = await prisma.reviewCard.findMany({
    where: { userId, dueDate: { lte: endOfToday() } },
    orderBy: { dueDate: 'asc' },
    include: { note: { select: { id: true, title: true, content: true } } }
  });
  return cards.map((c) => ({
    id: c.id,
    noteId: c.noteId,
    dueDate: c.dueDate,
    interval: c.interval,
    easeFactor: c.easeFactor,
    reps: c.reps,
    note: { id: c.note.id, title: c.note.title },
    quizzes: parseQuizzes(c.note.content)
  }));
}

// 评分: 更新卡状态 + 重算 Note.mastery (0-5)
async function gradeCardId(userId, cardId, quality, prisma) {
  const cid = parseInt(cardId);
  const card = await prisma.reviewCard.findFirst({ where: { id: cid, userId } });
  if (!card) return { error: 'not_found' };

  const res = gradeCard(
    { easeFactor: card.easeFactor, interval: card.interval, reps: card.reps },
    quality
  );

  const due = new Date();
  due.setDate(due.getDate() + res.dueInDays);

  const updated = await prisma.reviewCard.update({
    where: { id: cid },
    data: {
      easeFactor: res.easeFactor,
      interval: res.interval,
      reps: res.reps,
      dueDate: due,
      lastReviewedAt: new Date()
    }
  });

  // 掌握度 0-5: reps 越高越熟, interval>=15 天额外 +1 (驱动知识图谱着色)
  const mastery = Math.max(0, Math.min(5, res.reps + (res.interval >= 15 ? 1 : 0)));
  await prisma.note.update({ where: { id: card.noteId }, data: { mastery } });

  return { card: updated, mastery };
}

module.exports = { parseQuizzes, enrollNote, getTodayQueue, gradeCardId };
