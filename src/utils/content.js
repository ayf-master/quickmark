// 工具函数: 检测内容是 HTML 还是纯文本/Markdown
// 规则: 含常见 HTML 标签 -> 用 markdown 模式 (原本为富文本), 否则用纯文本
export function detectContentMode(content) {
  if (!content) return 'plain';
  if (/<(p|div|br|b|i|u|strong|em|ul|ol|li|h[1-6]|a|img|blockquote|pre|code|span)\b/i.test(content)) {
    return 'markdown';
  }
  return 'plain';
}

// 读 qm_csrf cookie (与 src/api/index.js 一致), 用于写操作 CSRF 校验
function readCsrfCookie() {
  const m = document.cookie.match(/(?:^|; )qm_csrf=([^;]+)/);
  return m ? m[1] : '';
}

// 工具函数: 上传图片, 返回 Promise<string> (url)
export async function uploadImageFile(file) {
  if (!file) throw new Error('未选择文件');
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
  const fd = new FormData();
  fd.append('file', file);
  const csrf = readCsrfCookie();
  const headers = csrf ? { 'X-CSRF-Token': csrf } : {};
  const resp = await fetch('/api/upload', { method: 'POST', body: fd, headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传失败');
  }
  const data = await resp.json();
  return data.url;
}
