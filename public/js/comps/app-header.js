// AppHeader - 移动端/平板顶部栏
const AppHeader = {
  components: { ThemeToggle },
  template: `
    <header class="flex items-center justify-between px-4 py-3 flex-shrink-0"
      style="background: var(--bg-panel); border-bottom: 1px solid var(--border-default);"
      v-if="store.isCompact">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- 汉堡按钮 -->
        <button
          class="btn btn-icon btn-ghost"
          @click="store.mobileDrawerOpen = true"
          aria-label="打开菜单"
          aria-expanded="store.mobileDrawerOpen">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <!-- Logo -->
        <h1 class="text-base font-bold flex items-center gap-1.5 flex-shrink-0"
          style="color: var(--text-primary);">
          <span style="color: var(--color-accent);">⚡</span>
          <span class="hidden sm:inline">QuickMark</span>
        </h1>

        <!-- 搜索框 (移动端居中) -->
        <div class="relative flex-1 max-w-xs ml-2">
          <input type="text"
            v-model="store.searchQuery"
            @input="store.onSearchInput()"
            data-search-input
            placeholder="搜索..."
            class="input pl-9"
            style="padding-top: 6px; padding-bottom: 6px;"
            aria-label="搜索笔记" />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style="color: var(--text-tertiary);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>

      <div class="flex items-center gap-1 flex-shrink-0">
        <!-- 新建笔记 (移动端快捷) -->
        <button
          class="btn btn-icon btn-primary"
          @click="store.createNote()"
          style="width:32px;height:32px;"
          aria-label="新建笔记"
          title="新建笔记">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
        <ThemeToggle />
      </div>
    </header>
  `,
  setup() {
    return { store };
  }
};
