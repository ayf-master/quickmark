// markdown-it 标注插件: 将自定义标注标签渲染为可视化 HTML
// 由于 markdown-it 已开启 html: true, 自定义标签原样通过,
// 只需在渲染后做字符串替换即可

const RULES = [
  // 高亮: <qm-mark color="#ffeb3b">text</qm-mark>
  {
    re: /<qm-mark\s+color="([^"]*)"\s*>([\s\S]*?)<\/qm-mark>/gi,
    replace: (_, color, text) =>
      `<span class="qm-annot qm-highlight" style="background:${color || '#ffeb3b'}">${text}</span>`
  },
  // 划线: <qm-u>text</qm-u>
  {
    re: /<qm-u>([\s\S]*?)<\/qm-u>/gi,
    replace: (_, text) =>
      `<span class="qm-annot qm-underline">${text}</span>`
  },
  // 批注: <qm-cmt note="批注内容">text</qm-cmt>
  {
    re: /<qm-cmt\s+note="([^"]*)"\s*>([\s\S]*?)<\/qm-cmt>/gi,
    replace: (_, note, text) =>
      `<span class="qm-annot qm-comment" title="${note.replace(/"/g, '&quot;')}">${text}<sup class="qm-cmt-marker">💬</sup></span>`
  }
];

/**
 * 将渲染后的 HTML 中的标注标签替换为可视化元素
 * @param {string} html - markdown-it 渲染后的 HTML
 * @returns {string}
 */
export function renderAnnotations(html) {
  if (!html) return '';
  let result = html;
  for (const rule of RULES) {
    result = result.replace(rule.re, rule.replace);
  }
  return result;
}
