// API 封装层 - 阶段 7: 接入 JWT cookie 鉴权
//
// 关键设计:
// 1. 所有 fetch 加 credentials: 'include' (浏览器自动带 cookie)
// 2. 写操作 (POST/PUT/DELETE) 必须带 X-CSRF-Token header, 值从 qm_csrf cookie 读
// 3. 401 自动尝试 /api/auth/refresh 一次, 成功则重发原请求, 失败则 throw 401
// 4. csrfToken 是懒读, 登录成功 (Set-Cookie 写入) 后第一次写操作前读才有效
//
// 与后端的对应关系 (prisma/auth.js):
//   - cookie 名: qm_access / qm_refresh / qm_csrf
//   - access/refresh HttpOnly (JS 读不到), qm_csrf 非 HttpOnly (JS 读得到)
//   - CSRF 中间件校验: cookie 值 === header 值 (用 crypto.timingSafeEqual)

function readCsrfCookie() {
  // 解析 document.cookie 找 qm_csrf=...
  const m = document.cookie.match(/(?:^|; )qm_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

let refreshPromise = null;  // 单飞: 多个并发 401 共享一次 refresh

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
      // 200ms 后清掉, 让下一次 401 能再触发 refresh
      setTimeout(() => { refreshPromise = null; }, 200);
    }
  })();
  return refreshPromise;
}

async function authedFetch(url, options = {}) {
  const opts = {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers || {})
    }
  };
  const method = (opts.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = readCsrfCookie();
    if (csrf) opts.headers['X-CSRF-Token'] = csrf;
  }

  let resp = await fetch(url, opts);

  // 401 自动 refresh 一次
  if (resp.status === 401 && !url.includes('/api/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // refresh 成功, 重发原请求 (refresh 后 csrfToken 不变, 但保险起见重读)
      const csrf2 = readCsrfCookie();
      if (csrf2 && method !== 'GET') opts.headers['X-CSRF-Token'] = csrf2;
      resp = await fetch(url, opts);
    }
  }

  return resp;
}

const API = {
  // ===== Auth =====
  async login(username, password) {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '登录失败' }));
      throw new Error(err.error || '登录失败');
    }
    return resp.json();
  },

  async logout() {
    const resp = await authedFetch('/api/auth/logout', { method: 'POST' });
    if (!resp.ok) throw new Error('登出失败');
    return resp.json();
  },

  async register({ username, password, email, displayName }) {
    // 注册成功后后端会自动 setAuthCookies, 跟 login 一样
    const resp = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, displayName })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '注册失败' }));
      throw new Error(err.error || '注册失败');
    }
    return resp.json();
  },

  async me() {
    let resp = await fetch('/api/auth/me', { credentials: 'include' });
    // 访问令牌过期但刷新令牌(30天)可能仍有效 → 尝试刷新
    if (resp.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        resp = await fetch('/api/auth/me', { credentials: 'include' });
      }
    }
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.user || null;
  },

  // ===== Notes =====
  async getNotes(params = {}) {
    const q = new URLSearchParams(params).toString();
    const resp = await authedFetch('/api/notes' + (q ? '?' + q : ''));
    if (!resp.ok) throw new Error('获取笔记失败');
    return resp.json();
  },
  async getNote(id) {
    const resp = await authedFetch('/api/notes/' + id);
    if (!resp.ok) throw new Error('获取笔记失败');
    return resp.json();
  },
  async createNote(data) {
    const resp = await authedFetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '创建失败' }));
      throw new Error(err.error || '创建失败');
    }
    return resp.json();
  },
  async updateNote(id, data) {
    const resp = await authedFetch('/api/notes/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '更新失败' }));
      throw new Error(err.error || '更新失败');
    }
    return resp.json();
  },
  async deleteNote(id) {
    const resp = await authedFetch('/api/notes/' + id, { method: 'DELETE' });
    if (!resp.ok) throw new Error('删除失败');
    return resp.json();
  },
  async togglePin(id) {
    const resp = await authedFetch('/api/notes/' + id + '/pin', { method: 'POST' });
    if (!resp.ok) throw new Error('操作失败');
    return resp.json();
  },

  // ===== Categories =====
  async getCategories() {
    const resp = await authedFetch('/api/categories');
    if (!resp.ok) throw new Error('获取分类失败');
    return resp.json();
  },
  async createCategory(data) {
    const resp = await authedFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '创建失败' }));
      throw new Error(err.error || '创建失败');
    }
    return resp.json();
  },
  async updateCategory(id, data) {
    const resp = await authedFetch('/api/categories/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '更新失败' }));
      throw new Error(err.error || '更新失败');
    }
    return resp.json();
  },
  async deleteCategory(id) {
    const resp = await authedFetch('/api/categories/' + id, { method: 'DELETE' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '删除失败' }));
      throw new Error(err.error || '删除失败');
    }
    return resp.json();
  },
  async reorderNotes(ids) {
    const resp = await authedFetch('/api/notes/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '排序失败' }));
      throw new Error(err.error || '排序失败');
    }
    return resp.json();
  },
  async reorderCategories(ids) {
    const resp = await authedFetch('/api/categories/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '排序失败' }));
      throw new Error(err.error || '排序失败');
    }
    return resp.json();
  },


  // ===== Feedback =====
  async submitFeedback({ content, contact }) {
    const resp = await authedFetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, contact })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '提交失败' }));
      throw new Error(err.error || '提交失败');
    }
    return resp.json();
  },

  async getFeedback(page) {
    const q = page ? '?page=' + page : '';
    const resp = await authedFetch('/api/feedback' + q);
    if (!resp.ok) throw new Error('获取反馈失败');
    return resp.json();
  },

  async deleteFeedback(id) {
    const resp = await authedFetch('/api/feedback/' + id, { method: 'DELETE' });
    if (!resp.ok) throw new Error('删除失败');
    return resp.json();
  },

  // ===== Settings (功能开关) =====
  async getSettings() {
    const resp = await authedFetch('/api/settings');
    if (!resp.ok) throw new Error('获取设置失败');
    return resp.json();
  },
  async updateSettings(settings) {
    const resp = await authedFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!resp.ok) throw new Error('保存设置失败');
    return resp.json();
  },

  // ===== 间隔重复 (Spaced Repetition) =====
  async enrollReview() {
    // 批量注册: 扫描全部含 [[quiz]] 的笔记, 建复习卡
    const resp = await authedFetch('/api/review/enroll-all', { method: 'POST' });
    if (!resp.ok) throw new Error('注册复习卡失败');
    return resp.json();
  },
  async getReviewQueue() {
    // 返回今日待复习队列 { today: [{cardId,noteId,title,q,a,dueDate}], mastery:{...} }
    const resp = await authedFetch('/api/review/today');
    if (!resp.ok) throw new Error('获取复习队列失败');
    return resp.json();
  },
  async gradeReview(cardId, quality) {
    // quality: 0-5 (Again/Hard/Good/Easy 映射到 0/3/4/5)
    const resp = await authedFetch('/api/review/' + cardId + '/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality })
    });
    if (!resp.ok) throw new Error('评分失败');
    return resp.json();
  },
  async getReviewStats() {
    // 复习统计: { dueToday, totalCards, masteredCount, streak }
    const resp = await authedFetch('/api/review/stats');
    if (!resp.ok) throw new Error('获取复习统计失败');
    return resp.json();
  }
};

export default API;
