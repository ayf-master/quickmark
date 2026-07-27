// 从笔记正文里解析 [[quiz:问题|答案]] 语法, 提取自测卡。
// 不新增存储: 复习卡完全由 content 实时解析得到 (计划文档 §2.3 内容即数据)。
const QUIZ_RE = /\[\[quiz:([^\]|]+)\|([^\]]+)\]\]/g;

// 返回 [{ q, a }], 顺序即出现顺序
export function parseQuizzes(content) {
  if (!content || typeof content !== 'string') return [];
  const out = [];
  let m;
  QUIZ_RE.lastIndex = 0;
  while ((m = QUIZ_RE.exec(content)) !== null) {
    const q = m[1].trim();
    const a = m[2].trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}

// 把正文里的 [[quiz:Q|A]] 标记渲染成占位符 (供 Markdown 后处理)。
// 返回 { html, quizzes }: html 里 quiz 用 <span data-quiz="i"> 占位, quizzes 是顺序数组。
// 这样既不影响 Markdown 渲染, 又能在预览里把 quiz 抽出来做成可翻面的卡。
export function extractQuizzesForRender(content) {
  const quizzes = parseQuizzes(content);
  if (!quizzes.length) return { html: content, quizzes: [] };
  let i = 0;
  const html = content.replace(QUIZ_RE, () => {
    const idx = i++;
    return `[[__QUIZ_PLACEHOLDER_${idx}__]]`;
  });
  return { html, quizzes };
}
