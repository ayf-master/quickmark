/**
 * prisma/routes-review.js — 间隔重复路由 (简化版)
 *
 * 端点:
 *   POST /api/review/enroll-all       批量注册所有笔记的复习卡
 *   GET  /api/review/due              今日到期笔记列表 (供前端高亮)
 *   POST /api/review/:cardId/mark     标记一篇笔记为已复习
 *   GET  /api/review/stats            复习统计
 *
 * 挂载: app.use('/api/review', require('./prisma/routes-review'))
 */
const express = require('express');
const router = express.Router();
const review = require('./review');

async function requireFeature(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '未登录或登录已过期' });
  try {
    const prisma = req.app.locals.prisma;
    const u = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { settings: true }
    });
    const features = (u && u.settings && u.settings.features) || {};
    if (features.spacedRepetition !== true) {
      return res.status(403).json({ error: '功能未开启: 间隔重复' });
    }
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器错误' });
  }
}

// POST /api/review/enroll-all
// 注意: 不使用 requireFeature 中间件——前端 toggle 功能时, 后端 DB 中的 feature
// 标志有 400ms 的 debounce 延迟, 使用 requireFeature 会导致竞态条件 (enroll 失败).
// 前端已根据 features.spacedRepetition 状态决定是否调用此端点.
router.post('/enroll-all', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const r = await review.enrollAll(req.user.id, prisma);
    res.json({ ok: true, created: r.created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/review/due — 今日到期笔记列表 (只读, 不依赖 feature flag)
// 前端已根据 features.spacedRepetition 控制是否调用; 即使没开功能,
// 返回空列表也不影响任何东西, 避免前端 toggle 时的竞态条件
router.get('/due', async (req, res) => {
  try {
    if (!req.user) return res.json({ due: [], count: 0 });
    const prisma = req.app.locals.prisma;
    const notes = await review.getDueNotes(req.user.id, prisma);
    res.json({ due: notes, count: notes.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/review/:cardId/mark — 标记已复习
router.post('/:cardId/mark', requireFeature, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const r = await review.markReviewed(req.user.id, req.params.cardId, prisma);
    if (r.error === 'not_found') return res.status(404).json({ error: '卡片不存在' });
    res.json({ ok: true, mastery: r.mastery, nextDue: r.nextDue });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/review/stats
router.get('/stats', requireFeature, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const stats = await review.getStats(req.user.id, prisma);
    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
