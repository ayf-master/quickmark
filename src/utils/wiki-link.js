// Wiki 链接解析引擎
// 从笔记内容中提取 [[标题]] 引用, 构建链接索引和图谱数据

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * 从内容字符串中提取 [[标题]] 引用 (去重)
 * @param {string} content
 * @returns {string[]}
 */
export function parseWikiLinks(content) {
  if (!content) return [];
  const links = [];
  let match;
  WIKI_LINK_RE.lastIndex = 0;
  while ((match = WIKI_LINK_RE.exec(content)) !== null) {
    const title = match[1].trim();
    if (title) links.push(title);
  }
  return [...new Set(links)];
}

/**
 * 从内容中提取嵌入的 wiki 链接 (<!-- qm-links:[...] -->)
 * @param {string} content
 * @returns {string[]}
 */
export function parseEmbeddedLinks(content) {
  if (!content) return [];
  const m = content.match(/<!--\s*qm-links:([^]*?)-->/);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[1].trim());
    if (Array.isArray(parsed)) {
      return parsed.map(item =>
        typeof item === 'string' ? item.trim() : (item.title || '').trim()
      ).filter(Boolean);
    }
  } catch (e) {
    // 兼容旧格式: 逗号分隔
    return m[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * 从内容中提取所有链接 ([[标题]] + 嵌入链接), 去重
 * @param {string} content
 * @returns {string[]}
 */
export function parseAllLinks(content) {
  const a = parseWikiLinks(content);
  const b = parseEmbeddedLinks(content);
  return [...new Set([...a, ...b])];
}

/**
 * 通过标题精确匹配查找笔记
 * @param {Array} notes
 * @param {string} title
 * @returns {object|null}
 */
export function findNoteByTitle(notes, title) {
  return notes.find(n => n.title === title) || null;
}

/**
 * 从笔记数组构建链接索引 { noteId: [linkedTitle, ...] }
 * @param {Array} notes
 * @returns {object}
 */
export function buildLinkIndex(notes) {
  const index = {};
  for (const note of notes) {
    index[note.id] = parseAllLinks(note.content || '');
  }
  return index;
}

/**
 * 查找链接到给定笔记的所有笔记 (反向链接)
 * @param {number} noteId
 * @param {Array} notes
 * @param {object} linkIndex
 * @returns {Array<{id: number, title: string}>}
 */
export function findBacklinks(noteId, notes, linkIndex) {
  const target = notes.find(n => n.id === noteId);
  if (!target) return [];
  const targetTitle = target.title;
  const result = [];
  for (const note of notes) {
    if (note.id === noteId) continue;
    const links = linkIndex[note.id] || [];
    if (links.includes(targetTitle)) {
      result.push({ id: note.id, title: note.title });
    }
  }
  return result;
}

/**
 * 查找当前笔记引用了哪些笔记 (出链)
 * @param {number} noteId
 * @param {Array} notes
 * @param {object} linkIndex
 * @returns {Array<{title: string, note: object|null}>}
 */
export function findOutlinks(noteId, notes, linkIndex) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return [];
  const titles = linkIndex[noteId] || [];
  const annotations = parseLinkAnnotations(note.content || '');
  return titles.map(title => ({
    title,
    annotation: annotations[title] || '',
    note: findNoteByTitle(notes, title)
  }));
}

/**
 * 从笔记内容中提取带标注的链接元数据 { title → annotation }
 * @param {string} content
 * @returns {object}
 */
function parseLinkAnnotations(content) {
  const result = {};
  const m = (content || '').match(/<!--\s*qm-links:([^]*?)-->/);
  if (!m) return result;
  try {
    const parsed = JSON.parse(m[1].trim());
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const title = typeof item === 'string' ? item : item.title;
        const annotation = typeof item === 'string' ? '' : (item.annotation || '');
        if (title) result[title] = annotation;
      }
    }
  } catch (e) { /* ignore */ }
  return result;
}

/**
 * 为 d3 力导向图构建 { nodes, edges }
 * nodes: [{ id, title, outCount, inCount, totalCount }]
 * edges: [{ source: noteId, target: noteId, annotation: string }]
 * @param {Array} notes
 * @param {object} linkIndex
 * @returns {{ nodes: Array, edges: Array }}
 */
export function buildGraphData(notes, linkIndex) {
  const titleToId = {};
  const noteAnnotations = {}; // noteId → { title → annotation }
  for (const note of notes) {
    titleToId[note.title] = note.id;
    noteAnnotations[note.id] = parseLinkAnnotations(note.content || '');
  }

  const outDeg = {};
  const inDeg = {};
  for (const note of notes) {
    outDeg[note.id] = 0;
    inDeg[note.id] = 0;
  }
  for (const [noteId, titles] of Object.entries(linkIndex)) {
    for (const title of titles) {
      const targetId = titleToId[title];
      if (targetId && targetId !== Number(noteId)) {
        outDeg[Number(noteId)] = (outDeg[Number(noteId)] || 0) + 1;
        inDeg[targetId] = (inDeg[targetId] || 0) + 1;
      }
    }
  }

  const nodes = notes.map(n => ({
    id: n.id,
    title: n.title,
    mastery: n.mastery ?? 0,   // 0-5, 由 ReviewQueue 评分写入 Note.mastery
    outCount: outDeg[n.id] || 0,
    inCount: inDeg[n.id] || 0,
    totalCount: (outDeg[n.id] || 0) + (inDeg[n.id] || 0)
  }));

  const nodeIdSet = new Set(notes.map(n => n.id));
  const edges = [];

  for (const [noteId, titles] of Object.entries(linkIndex)) {
    const annotations = noteAnnotations[Number(noteId)] || {};
    for (const title of titles) {
      const targetId = titleToId[title];
      if (targetId && nodeIdSet.has(targetId) && targetId !== Number(noteId)) {
        edges.push({
          source: Number(noteId),
          target: targetId,
          annotation: annotations[title] || ''
        });
      }
    }
  }

  return { nodes, edges };
}
