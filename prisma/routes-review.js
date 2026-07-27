/**
 * prisma/routes-review.js — 间隔重复路由
 * 端点:
 *   POST /api/review/enroll/:noteId   把一篇笔记加入复习
 *   GET  /api/review/today            今日待复习队列 (含 [[quiz]] 解析)
 *   POST /api/review/:cardId/grade    提交评分, 更新卡 + 重算 Note.mastery
 *
 * 挂载: app.use('/api/review', require('./prisma/routes-review'))
 * 鉴权: 全局 /api 中间件已强制 requireAuth + CSRF (USE_PRISMA 模式)
 */
const express = require('express');
const router = express.Router();
const review = require('./review');

// D4: 服务端按功能开关拦截 — 实时读 User.settings, 关了 spacedRepetition 即使 curl 也 403
//      兜底: 若未登录 (req.user 为空) 直接 401, 不依赖全局中间件注册顺序
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

// ==================== POST /api/review/enroll/:noteId ====================
router.post('/enroll/:noteId', requireFeature, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const r = await review.enrollNote(req.user.id, req.params.noteId, prisma);
    if (r.error === 'not_found') return res.status(404).json({ error: '笔记不存在' });
    res.json({ ok: true, created: r.created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ==================== GET /api/review/today ====================
router.get('/today', requireFeature, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const queue = await review.getTodayQueue(req.user.id, prisma);
    res.json({ queue, count: queue.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ==================== POST /api/review/:cardId/grade ====================
router.post('/:cardId/grade', requireFeature, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const quality = parseInt(req.body.quality, 10);
    if (!(quality >= 0 && quality <= 5)) {
      return res.status(400).json({ error: 'quality 必须 0-5' });
    }
    const r = await review.gradeCardId(req.user.id, req.params.cardId, quality, prisma);
    if (r.error === 'not_found') return res.status(404).json({ error: '卡片不存在' });
    res.json({ ok: true, mastery: r.mastery });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
