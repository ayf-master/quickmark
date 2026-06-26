// 工具函数: 检测内容是 HTML(富文本) 还是 Markdown
// 规则: 含常见 HTML 标签 -> HTML, 否则视为 Markdown
export function detectContentMode(content) {
  if (!content) return 'rich';
  if (/<(p|div|br|b|i|u|strong|em|ul|ol|li|h[1-6]|a|img|blockquote|pre|code|span)\b/i.test(content)) {
    return 'rich';
  }
  return 'markdown';
}

// 工具函数: 上传图片, 返回 Promise<string> (url)
export async function uploadImageFile(file) {
  if (!file) throw new Error('未选择文件');
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
  const fd = new FormData();
  fd.append('file', file);
  const resp = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传失败');
  }
  const data = await resp.json();
  return data.url;
}
