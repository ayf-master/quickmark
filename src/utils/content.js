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
// 走 authedFetch 而不是裸 fetch: access token 过期时自动 /api/auth/refresh + 重传,
// 避免长会话 (>1h) 后粘贴图片报"未登录或登录已过期"
export async function uploadImageFile(file) {
  if (!file) throw new Error('未选择文件');
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
  const fd = new FormData();
  fd.append('file', file);
  const csrf = readCsrfCookie();
  const headers = csrf ? { 'X-CSRF-Token': csrf } : {};
  // 走 authedFetch: 401 时自动 refresh 后重试一次, 失败再抛 401
  const resp = await authedFetch('/api/upload', { method: 'POST', body: fd, headers });
  if (!resp.ok) {
    // refresh 后仍 401 → 真实登录失效, 错误更明确 (而不是闷头抛"上传失败")
    if (resp.status === 401) throw new Error('未登录或登录已过期, 请重新登录');
    const err = await resp.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传失败');
  }
  const data = await resp.json();
  return data.url;
}

// 上传用的 authedFetch: 与 src/api/index.js 行为一致, 401 自动 refresh 一次后重传
let refreshPromise = null;
async function tryRefresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const resp = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': readCsrfCookie() }
      });
      return resp.ok;
    } catch (e) {
      return false;
    } finally {
      setTimeout(() => { refreshPromise = null; }, 200);
    }
  })();
  return refreshPromise;
}
async function authedFetch(url, options = {}) {
  const opts = {
    credentials: 'include',
    ...options,
    headers: { ...(options.headers || {}) }
  };
  const method = (opts.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = readCsrfCookie();
    if (csrf) opts.headers['X-CSRF-Token'] = csrf;
  }
  let resp = await fetch(url, opts);
  if (resp.status === 401 && !url.includes('/api/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const csrf2 = readCsrfCookie();
      if (csrf2 && method !== 'GET') opts.headers['X-CSRF-Token'] = csrf2;
      resp = await fetch(url, opts);
    }
  }
  return resp;
}
