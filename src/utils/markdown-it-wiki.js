// markdown-it 插件: 将 [[笔记标题]] 渲染为可点击链接
// 注册为 inline rule, 在 'link' 规则之后解析, 保持标准 Markdown 链接优先

export default function wikiPlugin(md) {
  md.inline.ruler.after('link', 'wiki_link', (state, silent) => {
    const pos = state.pos;
    const src = state.src;

    // 检查 [[
    if (src.charCodeAt(pos) !== 0x5B) return false;
    if (src.charCodeAt(pos + 1) !== 0x5B) return false;

    // 查找 ]]
    const endMatch = src.indexOf(']]', pos + 2);
    if (endMatch === -1) return false;

    const title = src.slice(pos + 2, endMatch).trim();
    if (!title) return false;

    if (!silent) {
      const token = state.push('wiki_link_open', 'a', 1);
      token.attrs = [
        ['href', '#'],
        ['data-wiki-link', title],
        ['class', 'wiki-link'],
        ['title', '打开笔记: ' + title]
      ];

      const text = state.push('text', '', 0);
      text.content = title;

      state.push('wiki_link_close', 'a', -1);
    }

    state.pos = endMatch + 2;
    return true;
  });
}
