/**
 * server.js — QuickMark 后端
 *
 * 阶段 3 改造 (USE_PRISMA=1):
 *   - 14 个 API 走 prisma/dal.js 包装, 替换原 pool.query()
 *   - pool 仍保留作 upload 事务 / 健康检查兜底
 *
 * 阶段 3 改造 (USE_PRISMA=0, 默认):
 *   - 行为与阶段 1/2 完全一致, 用于双轨对比 + 应急回退
 */
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const cache = require('./src/utils/cache');
const logger = require('./src/utils/logger');
const helmet = require('helmet');

// 加载 .env (本地开发用, 生产环境由进程管理器/systemd 注入环境变量)
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const USE_PRISMA = process.env.USE_PRISMA === '1';

logger.info(`[启动] USE_PRISMA = ${USE_PRISMA ? 'ON (走 ORM)' : 'OFF (走 pool)'}`);

// ==================== 启动校验 ====================
function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    logger.error(`\n❌ 缺少环境变量: ${name}`);
    logger.error(`   请在 .env 文件中设置, 或从运行环境注入`);
    logger.error(`   参考 .env.example\n`);
    process.exit(1);
  }
  return value;
}

requireEnv('DB_PASSWORD');
// 阶段 4 鉴权: JWT secret 必填 (D2 方案)
require('./prisma/auth').requireJwtSecret();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'quickmark',
  waitForConnections: true,
  charset: 'utf8mb4'
};

let pool;
let prismaModule;

async function initDB() {
  if (USE_PRISMA) {
    prismaModule = require('./prisma/client-init');
    const prisma = prismaModule.getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    // 阶段 4: 暴露给 auth 路由用 (避免循环依赖)
    app.locals.prisma = prisma;
    logger.info('Prisma 客户端连接成功');
    cache.init(process.env.REDIS_URL);
    logger.info('Redis 缓存初始化' + (cache.isConnected() ? ' (已连接)' : ' (不可用, 降级直查 MySQL)'));
  } else {
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    logger.info('MySQL 连接成功 (pool 模式)');
    conn.release();
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// 阶段 4: helmet 安全头 (默认 CSP 偏严, 单独配宽松些以便内联 Vue 用法)
app.use(helmet({
  contentSecurityPolicy: false,            // Vue 内联模板风格较多, 留待前端调
  crossOriginResourcePolicy: { policy: 'cross-origin' }  // /uploads 图片允许跨域
}));

// 阶段 4: 鉴权中间件 (解析 cookie → req.user, 不强制登录)


// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      logger.info({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: duration + 'ms',
        userId: req.user ? req.user.id : null
      }, req.method + ' ' + req.originalUrl + ' ' + res.statusCode);
    }
  });
  next();
});

app.use(require('./prisma/auth').attachUser);

// 阶段 4: 挂载 /api/auth 路由 (login/refresh/logout/me/register)
//         这 5 个端点不走业务鉴权, 内部自行处理
app.use('/api/auth', require('./prisma/routes-auth'));

// 阶段 4: 业务 API 鉴权 (除 /api/auth/*, /api/health, /api/upload, /uploads 外都强制登录 + CSRF)
//          pool 模式 (USE_PRISMA=0) 不强制鉴权, 保留应急回退
const authMw = require('./prisma/auth');
if (USE_PRISMA) {
  app.use('/api', (req, res, next) => {
    // 白名单
    if (req.path.startsWith('/auth/')) return next();
    if (req.path === '/health') return next();
    if (req.path === '/upload') return next();
    // 强制鉴权 + CSRF
    authMw.requireAuth(req, res, (err) => {
      if (err) return;
      authMw.csrfProtection(req, res, next);
    });
  });
}

app.use(express.static(path.join(__dirname, 'public')));

// ==================== 图片上传 (双模式都走 multer) ====================

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^.a-z0-9]/g, '') || '.png';
    const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, base + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|gif|webp|svg\+xml|bmp|ico)$/i.test(file.mimetype);
    cb(ok ? null : new Error('仅支持图片文件'), ok);
  }
});

app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=604800')
}));

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未收到文件' });
    const url = '/uploads/' + req.file.filename;
    res.json({
      url,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    logger.error('上传失败:', err);
    res.status(500).json({ error: '上传失败' });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: '上传错误: ' + err.message });
  }
  if (err) {
    logger.error('请求错误:', err.message);
    return res.status(400).json({ error: err.message });
  }
  next();
});

// ==================== 健康检查 (Prisma 模式专有) ====================

app.get('/api/health', async (req, res) => {
  try {
    if (USE_PRISMA) {
      await prismaModule.ping();
      res.json({ status: 'ok', mode: 'prisma' });
    } else {
      const [rows] = await pool.query('SELECT 1 AS ok');
      res.json({ status: 'ok', mode: 'pool', db: rows[0] });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ==================== 通用错误处理 ====================

function handleApiError(res, err, label) {
  logger.error(`${label} 失败:`, err);
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || `${label}失败` });
}

// 阶段 4: pool 模式应急回退用 admin (id=1) — 阶段 5 移除 pool 时一起删
const POOL_FALLBACK_USER_ID = 1;


// ==================== 缓存失效辅助 ====================
function invalidateNoteCache(userId, noteId) {
  const keys = ['cat_tree:user:' + userId];
  if (noteId) keys.push('note:' + noteId);
  cache.del(...keys).catch(() => {});
}
function invalidateCategoryCache(userId) {
  cache.del('cat_tree:user:' + userId).catch(() => {});
}

// ==================== 笔记 API ====================

// 获取笔记列表（支持搜索和分类过滤）
app.get('/api/notes', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const data = await require('./prisma/dal').listNotes(req.user.id, req.query, prisma);
      return res.json(data);
    }
    // ---- 保留旧 pool 实现 (USE_PRISMA=0) ----
    const { search, category_id, pinned } = req.query;
    let sql = `
      SELECT DISTINCT n.*,
        GROUP_CONCAT(DISTINCT nc.category_id) AS category_ids,
        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ',') AS category_names
      FROM notes n
      LEFT JOIN note_categories nc ON n.id = nc.note_id
      LEFT JOIN categories c ON nc.category_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(n.title LIKE ? OR n.content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category_id) {
      const ids = String(category_id).split(',').map(s => parseInt(s)).filter(Boolean);
      const allIds = await getDescendantIds(ids);
      if (allIds.length > 0) {
        conditions.push('n.id IN (SELECT note_id FROM note_categories WHERE category_id IN (?))');
        params.push(allIds);
      } else {
        return res.json([]);
      }
    }

    if (pinned === 'true') conditions.push('n.is_pinned = 1');
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' GROUP BY n.id ORDER BY n.is_pinned DESC, n.updated_at DESC';

    const [rows] = await pool.query(sql, params);
    const notes = rows.map(row => ({
      ...row,
      category_ids: row.category_ids ? row.category_ids.split(',').map(Number) : [],
      category_names: row.category_names ? row.category_names.split(',') : []
    }));
    res.json(notes);
  } catch (err) {
    handleApiError(res, err, '获取笔记列表');
  }
});

// 获取单条笔记
app.get('/api/notes/:id', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const note = await require('./prisma/dal').getNote(req.user.id, req.params.id, prisma);
      if (!note) return res.status(404).json({ error: '笔记未找到' });
      return res.json(note);
    }
    const [notes] = await pool.query(`
      SELECT n.*,
        GROUP_CONCAT(DISTINCT nc.category_id) AS category_ids,
        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ',') AS category_names
      FROM notes n
      LEFT JOIN note_categories nc ON n.id = nc.note_id
      LEFT JOIN categories c ON nc.category_id = c.id
      WHERE n.id = ?
      GROUP BY n.id
    `, [req.params.id]);

    if (notes.length === 0) return res.status(404).json({ error: '笔记未找到' });
    const note = notes[0];
    note.category_ids = note.category_ids ? note.category_ids.split(',').map(Number) : [];
    note.category_names = note.category_names ? note.category_names.split(',') : [];
    res.json(note);
  } catch (err) {
    handleApiError(res, err, '获取笔记');
  }
});

// 创建笔记
app.post('/api/notes', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const note = await require('./prisma/dal').createNote(req.user.id, req.body, prisma);
      invalidateNoteCache(req.user.id);
      return res.status(201).json(note);
    }
    const { title, content, category_ids } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });
    const [result] = await pool.query(
      'INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)',
      [title.trim(), content || '', POOL_FALLBACK_USER_ID]
    );
    const noteId = result.insertId;
    if (category_ids && category_ids.length > 0) {
      const values = category_ids.map(cid => [noteId, cid]);
      await pool.query('INSERT INTO note_categories (note_id, category_id) VALUES ?', [values]);
    }
    const [note] = await pool.query('SELECT * FROM notes WHERE id = ?', [noteId]);
    res.status(201).json({ ...note[0], category_ids: category_ids || [] });
  } catch (err) {
    handleApiError(res, err, '创建笔记');
  }
});

// 更新笔记
app.put('/api/notes/:id', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const note = await require('./prisma/dal').updateNote(req.user.id, req.params.id, req.body, prisma);
      invalidateNoteCache(req.user.id, req.params.id);
      return res.json(note);
    }
    const { title, content, is_pinned, category_ids } = req.body;
    const noteId = req.params.id;
    if (title !== undefined && !title.trim()) return res.status(400).json({ error: '标题不能为空' });

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (is_pinned !== undefined) { updates.push('is_pinned = ?'); params.push(is_pinned); }

    if (updates.length > 0) {
      params.push(noteId);
      await pool.query(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (category_ids !== undefined) {
      await pool.query('DELETE FROM note_categories WHERE note_id = ?', [noteId]);
      if (category_ids.length > 0) {
        const values = category_ids.map(cid => [noteId, cid]);
        await pool.query('INSERT INTO note_categories (note_id, category_id) VALUES ?', [values]);
      }
    }

    const [note] = await pool.query('SELECT * FROM notes WHERE id = ?', [noteId]);
    res.json(note[0]);
  } catch (err) {
    handleApiError(res, err, '更新笔记');
  }
});

// 删除笔记
app.delete('/api/notes/:id', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const result = await require('./prisma/dal').deleteNote(req.user.id, req.params.id, prisma);
      invalidateNoteCache(req.user.id, req.params.id);
      return res.json(result);
    }
    await pool.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    handleApiError(res, err, '删除笔记');
  }
});

// ==================== 分类 API ====================

// 工具: 获取一个分类及其所有后代 id (BFS, 防环)
async function getDescendantIds(rootIds) {
  if (!rootIds || rootIds.length === 0) return [];
  const allIds = new Set();
  let frontier = [...rootIds];
  while (frontier.length > 0) {
    const [rows] = await pool.query(
      'SELECT id FROM categories WHERE parent_id IN (?)',
      [frontier]
    );
    frontier = [];
    for (const r of rows) {
      if (!allIds.has(r.id)) {
        allIds.add(r.id);
        frontier.push(r.id);
      }
    }
  }
  return [...allIds, ...rootIds];
}

// 工具: 含后代聚合的笔记数
async function getCategoryNoteCounts(rootIds) {
  if (!rootIds || rootIds.length === 0) return {};
  const result = {};
  for (const rootId of rootIds) {
    const subtreeIds = await getDescendantIds([rootId]);
    const [rows] = await pool.query(`
      SELECT COUNT(DISTINCT nc.note_id) AS note_count
      FROM note_categories nc
      WHERE nc.category_id IN (?)
    `, [subtreeIds]);
    result[rootId] = rows[0].note_count;
  }
  return result;
}

// 获取全部分类
app.get('/api/categories', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      return res.json(await require('./prisma/dal').listCategories(req.user.id, prisma));
    }
    const [rows] = await pool.query(`
      SELECT c.id, c.name, c.color, c.parent_id, c.created_at, c.updated_at
      FROM categories c
      ORDER BY c.parent_id IS NULL DESC, c.parent_id, c.name
    `);
    const allIds = rows.map(r => r.id);
    const countMap = await getCategoryNoteCounts(allIds);
    const result = rows.map(r => ({ ...r, note_count: countMap[r.id] || 0 }));
    res.json(result);
  } catch (err) {
    handleApiError(res, err, '获取分类');
  }
});

// 创建分类
app.post('/api/categories', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const cat = await require('./prisma/dal').createCategory(req.user.id, req.body, prisma);
      invalidateCategoryCache(req.user.id);
      return res.status(201).json(cat);
    }
    const { name, color, parent_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '分类名称不能为空' });
    if (parent_id) {
      const [p] = await pool.query('SELECT id FROM categories WHERE id = ?', [parent_id]);
      if (p.length === 0) return res.status(400).json({ error: '父级分类不存在' });
    }
    const [result] = await pool.query(
      'INSERT INTO categories (name, color, parent_id, user_id) VALUES (?, ?, ?, ?)',
      [name.trim(), color || '#6366f1', parent_id || null, POOL_FALLBACK_USER_ID]
    );
    const [cat] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...cat[0], note_count: 0 });
  } catch (err) {
    handleApiError(res, err, '创建分类');
  }
});

// 更新分类
app.put('/api/categories/:id', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const cat = await require('./prisma/dal').updateCategory(req.user.id, req.params.id, req.body, prisma);
      invalidateCategoryCache(req.user.id);
      return res.json(cat);
    }
    const { name, color, parent_id } = req.body;
    const catId = parseInt(req.params.id);
    if (isNaN(catId)) return res.status(400).json({ error: '无效的 ID' });
    if (name !== undefined && !name.trim()) return res.status(400).json({ error: '分类名称不能为空' });
    if (parent_id !== undefined && parent_id !== null) {
      if (parent_id === catId) return res.status(400).json({ error: '不能将分类设为自己的父级' });
      const descendants = await getDescendantIds([catId]);
      if (descendants.includes(parent_id)) return res.status(400).json({ error: '不能将分类移动到其子分类下' });
      const [p] = await pool.query('SELECT id FROM categories WHERE id = ?', [parent_id]);
      if (p.length === 0) return res.status(400).json({ error: '父级分类不存在' });
    }
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (color !== undefined) { updates.push('color = ?'); params.push(color); }
    if (parent_id !== undefined) { updates.push('parent_id = ?'); params.push(parent_id || null); }
    if (updates.length > 0) {
      params.push(catId);
      await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    const [cat] = await pool.query('SELECT * FROM categories WHERE id = ?', [catId]);
    res.json(cat[0]);
  } catch (err) {
    handleApiError(res, err, '更新分类');
  }
});

// 删除分类
app.delete('/api/categories/:id', async (req, res) => {
  try {
    if (USE_PRISMA) {
      const prisma = prismaModule.getPrisma();
      const result = await require('./prisma/dal').deleteCategory(req.user.id, req.params.id, prisma);
      invalidateCategoryCache(req.user.id);
      return res.json(result);
    }
    const catId = parseInt(req.params.id);
    const [children] = await pool.query('SELECT COUNT(*) AS n FROM categories WHERE parent_id = ?', [catId]);
    const [notes] = await pool.query('SELECT COUNT(DISTINCT note_id) AS n FROM note_categories WHERE category_id = ?', [catId]);
    if (children[0].n > 0 || notes[0].n > 0) {
      logger.info(`删除分类 ${catId}: 含 ${children[0].n} 个子分类, ${notes[0].n} 个笔记关联`);
    }
    await pool.query('DELETE FROM categories WHERE id = ?', [catId]);
    res.json({ message: '删除成功', child_count: children[0].n, note_count: notes[0].n });
  } catch (err) {
    handleApiError(res, err, '删除分类');
  }
});

// ==================== 启动 ====================

initDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`QuickMark 笔记应用已启动: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    logger.error('数据库连接失败:', err.message);
    logger.info('请先运行: npm run init-db');
    process.exit(1);
  });

// 优雅关闭 (Prisma 模式专有, pool 模式不需)
process.on('SIGTERM', async () => {
  if (USE_PRISMA && prismaModule) await prismaModule.disconnect();
  await cache.disconnect();
  process.exit(0);
});
process.on('SIGINT', async () => {
  if (USE_PRISMA && prismaModule) await prismaModule.disconnect();
  await cache.disconnect();
  process.exit(0);
});
