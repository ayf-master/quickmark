/**
 * 数据访问层 (DAL) — Prisma ORM 包装
 *
 * 阶段 3 引入, 替换 server.js 里手写的 pool.query() 调用。
 * 阶段 4 改造: 每个函数加 userId 第一参数, 多用户隔离。
 *
 * 行为零变化:
 *   - 返回字段名 / 类型不变 (snake_case 来自 @map)
 *   - category_ids / category_names 仍用逗号分隔字符串
 *   - 错误码 / 错误消息不变
 *   - 401/403 抛带 statusCode 的 Error, server.js 统一处理
 */
const { Prisma } = require('@prisma/client');
const cache = require('../src/utils/cache');
const logger = require('../src/utils/logger');

// ==================== 用户 (User) ====================

/** 按 username 找用户 (登录用) */
async function findUserByUsername(username, prisma) {
  return prisma.user.findUnique({ where: { username } });
}

/** 按 id 找用户 (JWT 验证后 attachUser 用) */
async function findUserById(id, prisma) {
  return prisma.user.findUnique({ where: { id } });
}

/** 创建用户 (注册用) */
async function createUser({ username, email, passwordHash, displayName, role }, prisma) {
  // 唯一性检查
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    const err = new Error('用户名已存在');
    err.statusCode = 409;
    throw err;
  }
  return prisma.user.create({
    data: {
      username,
      email: email || null,
      passwordHash,
      displayName: displayName || username,
      role: role || 'user'
    }
  });
}

// ==================== 工具 ====================

/** 拿一个分类及其所有后代 id (BFS, 防环) */
async function getDescendantIds(rootIds, prisma) {
  if (!rootIds || rootIds.length === 0) return [];
  const allIds = new Set();
  let frontier = [...rootIds];
  while (frontier.length > 0) {
    const rows = await prisma.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true }
    });
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

/** 给定一组"根"分类 id, 返回每个根 id 含其所有后代后聚合的笔记数 */
async function getCategoryNoteCounts(rootIds, prisma) {
  if (!rootIds || rootIds.length === 0) return {};
  const result = {};
  for (const rootId of rootIds) {
    const subtreeIds = await getDescendantIds([rootId], prisma);
    const count = await prisma.noteCategory.findMany({
      where: { categoryId: { in: subtreeIds } },
      select: { noteId: true },
      distinct: ['noteId']
    });
    result[rootId] = count.length;
  }
  return result;
}

/** 全文检索笔记 id (notes.title + notes.content, 需 ngram 解析器的 FULLTEXT 索引才生效)
 *  返回命中 id 列表; 若索引缺失/语法异常, 自动降级为 LIKE, 保证搜索始终可用 */
async function searchNoteIds(userId, search, prisma) {
  const terms = search.trim().split(/\s+/).filter(Boolean).map(t => '+' + t + '*').join(' ');
  if (!terms) return [];
  try {
    const rows = await prisma.$queryRaw`
      SELECT n.id FROM notes n
      WHERE n.user_id = ${userId}
        AND MATCH(n.title, n.content) AGAINST (${terms} IN BOOLEAN MODE)
    `;
    return rows.map(r => r.id);
  } catch (e) {
    logger.warn('FULLTEXT 搜索不可用, 降级 LIKE:', e.message);
    const notes = await prisma.note.findMany({
      where: { userId, OR: [{ title: { contains: search } }, { content: { contains: search } }] },
      select: { id: true }
    });
    return notes.map(n => n.id);
  }
}

// ==================== 笔记 (Note) ====================

/** GET /api/notes — 笔记列表 (支持 search / category_id / pinned) */
async function listNotes(userId, { search, category_id, pinned }, prisma) {
  const where = { userId };  // 阶段 4: 多用户隔离
  if (search) {
    // 走 FULLTEXT + ngram 索引做中文全文检索, 失败自动降级 LIKE
    const ids = await searchNoteIds(userId, search, prisma);
    if (ids.length === 0) return [];
    where.id = { in: ids };
  }
  if (pinned === 'true' || pinned === true) {
    where.isPinned = true;
  }
  if (category_id) {
    const ids = String(category_id).split(',').map(s => parseInt(s)).filter(Boolean);
    // 阶段 4: 验证传入的分类都归当前用户, 防止越权
    const owned = await prisma.category.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true }
    });
    const ownedIds = owned.map(c => c.id);
    if (ownedIds.length === 0) return [];
    const allIds = await getDescendantIds(ownedIds, prisma);
    where.categories = { some: { categoryId: { in: allIds } } };
  }
  const rows = await prisma.note.findMany({
    where,
    include: { categories: { include: { category: true } } },
    orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { updatedAt: 'desc' }]
  });
  return rows.map(formatNote);
}

/** GET /api/notes/:id — 单条笔记 (鉴权后只能看自己)
 *  缓存 key 必须含 userId: 否则越权访问缓存的 null 会让真主人拿到 404 */
async function getNote(userId, id, prisma) {
  const noteId = parseInt(id);
  const cacheKey = 'note:' + userId + ':' + noteId;
  return cache.wrap(cacheKey, 600, async () => {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { categories: { include: { category: true } } }
    });
    if (!note || note.userId !== userId) return null;
    return formatNote(note);
  });
}

/** POST /api/notes — 创建笔记 */
async function createNote(userId, { title, content, category_ids }, prisma) {
  if (!title || !title.trim()) {
    const err = new Error('标题不能为空');
    err.statusCode = 400;
    throw err;
  }
  // 阶段 4: 验证分类都归当前用户
  if (category_ids && category_ids.length > 0) {
    const owned = await prisma.category.findMany({
      where: { id: { in: category_ids }, userId },
      select: { id: true }
    });
    const ownedIds = new Set(owned.map(c => c.id));
    const invalid = category_ids.filter(cid => !ownedIds.has(cid));
    if (invalid.length > 0) {
      const err = new Error(`分类 ${invalid.join(',')} 不存在或不属于当前用户`);
      err.statusCode = 400;
      throw err;
    }
  }
  const note = await prisma.note.create({
    data: {
      title: title.trim(),
      content: content || '',
      userId,
      categories: category_ids && category_ids.length > 0
        ? { create: category_ids.map(cid => ({ categoryId: cid })) }
        : undefined
    },
    include: { categories: { include: { category: true } } }
  });
  return formatNote(note);
}

/** PUT /api/notes/:id — 更新笔记 */
async function updateNote(userId, id, { title, content, is_pinned, category_ids }, prisma) {
  const noteId = parseInt(id);
  if (title !== undefined && !title.trim()) {
    const err = new Error('标题不能为空');
    err.statusCode = 400;
    throw err;
  }
  // 阶段 4: 先查笔记是否属于当前用户
  const existing = await prisma.note.findUnique({ where: { id: noteId } });
  if (!existing || existing.userId !== userId) {
    const err = new Error('笔记不存在');
    err.statusCode = 404;
    throw err;
  }
  const data = {};
  if (title !== undefined) data.title = title.trim();
  if (content !== undefined) data.content = content;
  if (is_pinned !== undefined) data.isPinned = is_pinned;

  // 分类替换需要事务: 删旧 + 插新 + 验证新分类归属
  if (category_ids !== undefined) {
    if (category_ids.length > 0) {
      const owned = await prisma.category.findMany({
        where: { id: { in: category_ids }, userId },
        select: { id: true }
      });
      const ownedIds = new Set(owned.map(c => c.id));
      const invalid = category_ids.filter(cid => !ownedIds.has(cid));
      if (invalid.length > 0) {
        const err = new Error(`分类 ${invalid.join(',')} 不存在或不属于当前用户`);
        err.statusCode = 400;
        throw err;
      }
    }
    return prisma.$transaction(async (tx) => {
      await tx.noteCategory.deleteMany({ where: { noteId } });
      if (category_ids.length > 0) {
        await tx.noteCategory.createMany({
          data: category_ids.map(cid => ({ noteId, categoryId: cid }))
        });
      }
      return tx.note.update({
        where: { id: noteId },
        data,
        include: { categories: { include: { category: true } } }
      }).then(formatNote);
    });
  }

  if (Object.keys(data).length === 0) {
    return getNote(userId, noteId, prisma);
  }
  const note = await prisma.note.update({
    where: { id: noteId },
    data,
    include: { categories: { include: { category: true } } }
  });
  return formatNote(note);
}

/** DELETE /api/notes/:id — 删除笔记 (CASCADE 删关联) */
async function deleteNote(userId, id, prisma) {
  const noteId = parseInt(id);
  const existing = await prisma.note.findUnique({ where: { id: noteId } });
  if (!existing || existing.userId !== userId) {
    const err = new Error('笔记不存在');
    err.statusCode = 404;
    throw err;
  }
  await prisma.note.delete({ where: { id: noteId } });
  return { message: '删除成功' };
}

// ==================== 分类 (Category) ====================

/** GET /api/categories — 当前用户的全部分类 (扁平 + note_count 含后代) */
async function listCategories(userId, prisma) {
  return cache.wrap('cat_tree:user:' + userId, 300, async () => {
    const rows = await prisma.category.findMany({
    where: { userId },  // 阶段 4: 多用户隔离
    orderBy: [{ parentId: { sort: 'asc', nulls: 'first' } }, { position: 'asc' }, { name: 'asc' }]
  });
  const allIds = rows.map(r => r.id);
  const countMap = await getCategoryNoteCounts(allIds, prisma);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    color: r.color,
    parent_id: r.parentId,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    note_count: countMap[r.id] || 0
  }));
  });
}

/** POST /api/categories — 创建分类 */
async function createCategory(userId, { name, color, parent_id }, prisma) {
  if (!name || !name.trim()) {
    const err = new Error('分类名称不能为空');
    err.statusCode = 400;
    throw err;
  }
  if (parent_id) {
    const p = await prisma.category.findUnique({ where: { id: parent_id } });
    if (!p || p.userId !== userId) {  // 阶段 4: 父级必须归当前用户
      const err = new Error('父级分类不存在');
      err.statusCode = 400;
      throw err;
    }
  }
  const cat = await prisma.category.create({
    data: {
      name: name.trim(),
      color: color || '#6366f1',
      parentId: parent_id || null,
      userId
    }
  });
  // 转 snake_case + ISO, 与 listCategories 输出一致
  return {
    id: cat.id,
    name: cat.name,
    color: cat.color,
    parent_id: cat.parentId,
    created_at: cat.createdAt,
    updated_at: cat.updatedAt,
    note_count: 0
  };
}

/** PUT /api/categories/:id — 更新分类 (含循环防护) */
async function updateCategory(userId, id, { name, color, parent_id }, prisma) {
  const catId = parseInt(id);
  if (isNaN(catId)) {
    const err = new Error('无效的 ID');
    err.statusCode = 400;
    throw err;
  }
  if (name !== undefined && !name.trim()) {
    const err = new Error('分类名称不能为空');
    err.statusCode = 400;
    throw err;
  }
  // 阶段 4: 验证当前分类属于当前用户
  const existing = await prisma.category.findUnique({ where: { id: catId } });
  if (!existing || existing.userId !== userId) {
    const err = new Error('分类不存在');
    err.statusCode = 404;
    throw err;
  }
  if (parent_id !== undefined && parent_id !== null) {
    if (parent_id === catId) {
      const err = new Error('不能将分类设为自己的父级');
      err.statusCode = 400;
      throw err;
    }
    const descendants = await getDescendantIds([catId], prisma);
    if (descendants.includes(parent_id)) {
      const err = new Error('不能将分类移动到其子分类下');
      err.statusCode = 400;
      throw err;
    }
    const p = await prisma.category.findUnique({ where: { id: parent_id } });
    if (!p || p.userId !== userId) {
      const err = new Error('父级分类不存在');
      err.statusCode = 400;
      throw err;
    }
  }
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (color !== undefined) data.color = color;
  if (parent_id !== undefined) data.parentId = parent_id || null;

  if (Object.keys(data).length === 0) {
    const r = await prisma.category.findUnique({ where: { id: catId } });
    return {
      id: r.id, name: r.name, color: r.color,
      parent_id: r.parentId, created_at: r.createdAt, updated_at: r.updatedAt
    };
  }
  const r = await prisma.category.update({ where: { id: catId }, data });
  return {
    id: r.id, name: r.name, color: r.color,
    parent_id: r.parentId, created_at: r.createdAt, updated_at: r.updatedAt
  };
}

/** DELETE /api/categories/:id — 删除分类 (CASCADE 删子级 + 关联) */
async function deleteCategory(userId, id, prisma) {
  const catId = parseInt(id);
  const existing = await prisma.category.findUnique({ where: { id: catId } });
  if (!existing || existing.userId !== userId) {
    const err = new Error('分类不存在');
    err.statusCode = 404;
    throw err;
  }
  const childCount = await prisma.category.count({ where: { parentId: catId } });
  const noteCount = await prisma.noteCategory.findMany({
    where: { categoryId: catId },
    select: { noteId: true },
    distinct: ['noteId']
  });
  if (childCount > 0 || noteCount.length > 0) {
    logger.info(`删除分类 ${catId}: 含 ${childCount} 个子分类, ${noteCount.length} 个笔记关联`);
  }
  await prisma.category.delete({ where: { id: catId } });
  return { message: '删除成功', child_count: childCount, note_count: noteCount.length };
}

// ==================== 内部: 行格式化 ====================

/** 把 Prisma note 行格式化成与原 SQL 输出一致的对象 */
function formatNote(note) {
  const ids = note.categories.map(c => c.categoryId);
  const names = [...note.categories.map(c => c.category?.name).filter(Boolean)]
    .sort()
    .join(',');
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    is_pinned: note.isPinned,
    position: note.position || 0,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    mastery: note.mastery ?? 0,   // 0-5, 复习越熟越高, 驱动知识图谱着色
    category_ids: ids,
    category_names: names ? names.split(',') : []
  };
}


// ===== 意见反馈 =====
async function createFeedback({ content, contact, userId }, prisma) {
  return prisma.feedback.create({
    data: { content, contact: contact || null, userId: userId || null }
  });
}

async function listFeedback(page = 1, pageSize = 20, prisma) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { owner: { select: { username: true, displayName: true } } }
    }),
    prisma.feedback.count()
  ]);
  return { items, total, page, pageSize };
}

async function deleteFeedback(id, prisma) {
  return prisma.feedback.delete({ where: { id } });
}

module.exports = {
  // 用户
  findUserByUsername,
  findUserById,
  createUser,
  // 工具
  getDescendantIds,
  getCategoryNoteCounts,
  // 笔记
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  // 分类
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createFeedback,
  listFeedback,
  deleteFeedback
};
