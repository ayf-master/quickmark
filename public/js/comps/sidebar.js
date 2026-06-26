// CategoryTreeNode - 递归渲染单条分类行 (含子分类)
const CategoryTreeNode = {
  name: 'CategoryTreeNode',
  props: {
    node: { type: Object, required: true }
  },
  emits: ['select', 'create-child', 'edit', 'delete', 'toggle-expand'],
  template: `
    <div>
      <div
        @click="$emit('select', node)"
        class="w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center justify-between transition-all mb-0.5 group category-row"
        :class="{ 'is-selected': store.selectedCategoryId === node.id }">
        <span class="flex items-center gap-1.5 min-w-0 flex-1">
          <!-- 展开/折叠箭头 -->
          <button v-if="node.children && node.children.length > 0"
            @click.stop="$emit('toggle-expand', node.id)"
            class="flex-shrink-0 w-4 h-4 flex items-center justify-center"
            :aria-label="store.isCategoryExpanded(node.id) ? '折叠' : '展开'"
            :aria-expanded="store.isCategoryExpanded(node.id)">
            <svg class="w-3 h-3 transition-transform"
              :class="{ 'rotate-90': store.isCategoryExpanded(node.id) }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          <span v-else class="w-4 h-4 flex-shrink-0"></span>

          <!-- 颜色圆点 -->
          <span class="w-2 h-2 rounded-full flex-shrink-0"
            :style="{ backgroundColor: node.color }"></span>

          <!-- 名字 -->
          <span class="truncate" :title="node.name" v-text="node.name"></span>
        </span>
        <span class="flex items-center gap-1 flex-shrink-0">
          <span class="text-xs" style="color: var(--text-tertiary);" v-text="node.note_count"></span>
          <!-- 新建笔记 (在此分类下) -->
          <button @click.stop="store.createNote(node.id)"
            class="btn btn-icon-sm btn-ghost"
            :aria-label="'在 ' + node.name + ' 中新建笔记'"
            :title="'在 ' + node.name + ' 中新建笔记'">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
          <!-- 新建子分类 (hover 才出现) -->
          <button @click.stop="$emit('create-child', node.id)"
            class="btn btn-icon-sm btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
            :aria-label="'在 ' + node.name + ' 下新建子分类'"
            :title="'在 ' + node.name + ' 下新建子分类'">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 7h18M3 12h18M3 17h12"/>
            </svg>
          </button>
          <!-- 编辑 -->
          <button @click.stop="$emit('edit', node)"
            class="btn btn-icon-sm btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
            :aria-label="'编辑分类 ' + node.name"
            title="编辑">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <!-- 删除 -->
          <button @click.stop="$emit('delete', node)"
            class="btn btn-icon-sm btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
            :aria-label="'删除分类 ' + node.name"
            title="删除">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style="color: var(--color-danger);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </span>
      </div>

      <!-- 递归子节点 -->
      <div v-if="node.children && node.children.length > 0 && store.isCategoryExpanded(node.id)"
        class="cat-children">
        <CategoryTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          @select="(n) => $emit('select', n)"
          @create-child="(pid) => $emit('create-child', pid)"
          @edit="(n) => $emit('edit', n)"
          @delete="(n) => $emit('delete', n)"
          @toggle-expand="(id) => $emit('toggle-expand', id)" />
      </div>
    </div>
  `,
  setup() {
    return { store };
  }
};

const Sidebar = {
  components: { CategoryTreeNode },
  template: `
    <!-- 移动端遮罩 -->
    <div v-if="store.isCompact"
      class="drawer-overlay"
      :class="{ open: store.mobileDrawerOpen }"
      @click="store.mobileDrawerOpen = false"
      aria-hidden="true"></div>

    <!-- 侧边栏本体 -->
    <aside
      class="drawer-panel flex flex-col h-full"
      :class="sidebarClass"
      :style="sidebarStyle"
      role="navigation"
      aria-label="侧边导航"
      :aria-modal="store.isCompact ? 'true' : 'false'">
      <!-- Logo -->
      <div class="px-6 py-5 flex-shrink-0" style="border-bottom: 1px solid var(--border-default);">
        <h1 class="text-xl font-bold tracking-tight flex items-center gap-2"
          style="color: var(--text-primary);">
          <span style="color: var(--color-accent);">⚡</span>
          <span>QuickMark</span>
          <span class="text-xs font-normal ml-1" style="color: var(--text-tertiary);">快记</span>
        </h1>
      </div>

      <!-- 搜索 (桌面端) -->
      <div v-if="!store.isCompact" class="px-4 py-3 flex-shrink-0"
        style="border-bottom: 1px solid var(--border-default);">
        <div class="relative">
          <input type="text"
            v-model="store.searchQuery"
            @input="store.onSearchInput()"
            data-search-input
            placeholder="搜索笔记..."
            class="input pl-9"
            aria-label="搜索笔记" />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style="color: var(--text-tertiary);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>

      <!-- 全部笔记 (只展示) -->
      <div class="px-3 pt-4 flex-shrink-0">
        <button
          @click="store.selectAllNotes()"
          class="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all"
          :class="!store.selectedCategoryId ? 'cat-row-selected' : ''"
          :style="!store.selectedCategoryId ? activeItemStyle : idleItemStyle">
          <span class="flex items-center gap-2.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
            全部笔记
          </span>
          <span class="text-xs flex-shrink-0" style="color: var(--text-tertiary);" v-text="store.allNotesCount"></span>
        </button>
      </div>

      <!-- 分类列表 (树形) -->
      <nav class="flex-1 panel-scroll px-3 pb-4" aria-label="分类">
        <div class="flex items-center justify-between px-2 mb-2 mt-3">
          <h2 class="text-xs font-semibold uppercase tracking-wider"
            style="color: var(--text-tertiary);">分类</h2>
          <button class="btn btn-icon-sm btn-ghost"
            @click="createTopCategory"
            aria-label="新建顶级分类"
            title="新建分类">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>

        <div v-if="store.categoryTree.length === 0"
          class="text-center py-6 text-xs"
          style="color: var(--text-tertiary);">
          暂无分类,点击右上 ＋ 新建
        </div>

        <CategoryTreeNode
          v-for="root in store.categoryTree"
          :key="root.id"
          :node="root"
          @select="selectCategory"
          @create-child="createChildCategory"
          @edit="store.editCategory"
          @delete="store.deleteCategory"
          @toggle-expand="store.toggleCategoryExpanded" />
      </nav>
    </aside>
  `,
  setup() {
    const sidebarClass = Vue.computed(() => ({
      'sidebar-desktop': store.isDesktop,
      'sidebar-drawer': store.isCompact,
      'drawer-open': store.isCompact && store.mobileDrawerOpen
    }));

    const sidebarStyle = Vue.computed(() => {
      if (store.isDesktop) {
        return {
          width: 'var(--sidebar-width)',
          flexShrink: '0',
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-default)'
        };
      }
      return {
        position: 'fixed',
        top: '0',
        left: '0',
        bottom: '0',
        width: 'var(--sidebar-width)',
        maxWidth: '85vw',
        zIndex: '51',
        background: 'var(--bg-panel)',
        boxShadow: 'var(--shadow-xl)',
        transform: store.mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)'
      };
    });

    const activeItemStyle = {
      backgroundColor: 'var(--bg-active)',
      color: 'var(--color-primary)',
      fontWeight: '600'
    };
    const idleItemStyle = {
      color: 'var(--text-secondary)'
    };

    function selectCategory(node) {
      store.selectCategory(node.id);
    }
    function createTopCategory() {
      store.categoryForm = { name: '', color: '#5B8DEF', parent_id: null };
      store.editingCategoryId = null;
      store.showNewCategoryDialog = true;
    }
    function createChildCategory(parentId) {
      // 自动展开父级以便用户看到
      if (!store.isCategoryExpanded(parentId)) store.toggleCategoryExpanded(parentId);
      store.categoryForm = { name: '', color: '#5B8DEF', parent_id: parentId };
      store.editingCategoryId = null;
      store.showNewCategoryDialog = true;
    }

    // ===== Focus trap =====
    let previousFocus = null;
    function handleDrawerKeydown(e) {
      if (e.key === 'Escape') {
        store.mobileDrawerOpen = false;
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = document.querySelector('.sidebar-drawer');
      if (!panel) return;
      const focusable = [...panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )].filter(el => !el.disabled && el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    Vue.watch(() => store.mobileDrawerOpen, (open) => {
      if (open) {
        previousFocus = document.activeElement;
        document.addEventListener('keydown', handleDrawerKeydown);
        Vue.nextTick(() => {
          const panel = document.querySelector('.sidebar-drawer');
          const first = panel?.querySelector('button, input');
          first?.focus();
        });
      } else {
        document.removeEventListener('keydown', handleDrawerKeydown);
        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
          previousFocus = null;
        }
      }
    });

    return {
      store,
      sidebarClass,
      sidebarStyle,
      activeItemStyle,
      idleItemStyle,
      selectCategory,
      createTopCategory,
      createChildCategory
    };
  }
};

// scoped-style for tree & selected
(function () {
  const style = document.createElement('style');
  style.textContent = `
    .category-row.is-selected,
    .cat-row-selected {
      background-color: var(--bg-active) !important;
      color: var(--color-primary) !important;
      font-weight: 600;
    }
    .cat-children {
      margin-left: 14px;
      padding-left: 8px;
      border-left: 1px dashed var(--border-default);
    }
    .rotate-90 {
      transform: rotate(90deg);
    }
  `;
  document.head.appendChild(style);
})();
