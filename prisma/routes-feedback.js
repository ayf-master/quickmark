const express = require('express');
const router = express.Router();
const dal = require('./dal');
const { requireAuth } = require('./auth');

function getPrisma(req) { return req.app.locals.prisma; }

// POST /api/feedback - 提交反馈 (任意用户)
router.post('/', async (req, res) => {
  try {
    const { content, contact } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '请填写反馈内容' });
    }
    const feedback = await dal.createFeedback({
      content: content.trim(),
      contact: contact?.trim() || null,
      userId: req.user?.id
    }, getPrisma(req));
    res.json(feedback);
  } catch (err) {
    console.error('createFeedback error:', err);
    res.status(500).json({ error: '提交失败' });
  }
});

// GET /api/feedback - 查看反馈列表 (仅 admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' });
    const page = parseInt(req.query.page) || 1;
    const result = await dal.listFeedback(page, 20, getPrisma(req));
    res.json(result);
  } catch (err) {
    console.error('listFeedback error:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// DELETE /api/feedback/:id - 删除反馈 (仅 admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '无权限' });
    await dal.deleteFeedback(parseInt(req.params.id), getPrisma(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteFeedback error:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
