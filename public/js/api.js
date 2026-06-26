// QuickMark - API 封装
const API = {
  // Notes
  async getNotes(params = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.category_id) qs.set('category_id', params.category_id);
    if (params.pinned) qs.set('pinned', 'true');
    const res = await fetch(`/api/notes?${qs}`);
    if (!res.ok) throw new Error('获取笔记列表失败');
    return res.json();
  },

  async getNote(id) {
    const res = await fetch(`/api/notes/${id}`);
    if (!res.ok) throw new Error('获取笔记失败');
    return res.json();
  },

  async createNote(data) {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('创建笔记失败');
    return res.json();
  },

  async updateNote(id, data) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新笔记失败');
    return res.json();
  },

  async deleteNote(id) {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除笔记失败');
    return res.json();
  },

  // Categories
  async getCategories() {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('获取分类失败');
    return res.json();
  },

  async createCategory(data) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '创建分类失败');
    }
    return res.json();
  },

  async updateCategory(id, data) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '更新分类失败');
    }
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除分类失败');
    return res.json();
  }
};
