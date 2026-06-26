// QuickMark - 根组件 & 应用初始化
const { createApp } = Vue;

const App = {
  components: {
    AppHeader,
    Sidebar,
    NoteList,
    NoteEditor,
    CategoryDialog,
    ShortcutHelp,
    Toast
  },
  template: `
    <div class="flex flex-col h-full">
      <AppHeader />
      <div class="flex-1 min-h-0 flex">
        <Sidebar />
        <NoteList v-show="!store.isCompact || !store.editingNote" />
        <NoteEditor v-if="store.editingNote" v-show="store.isDesktop || store.isCompact" />
        <div v-else-if="store.isDesktop"
          class="flex-1 flex flex-col items-center justify-center"
          style="background: var(--bg-panel); color: var(--text-tertiary);">
          <svg class="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style="color: var(--border-default);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <p class="text-sm" style="color: var(--text-tertiary);">从左侧选择一篇笔记,或新建开始记录</p>
        </div>
      </div>
      <CategoryDialog />
      <ShortcutHelp />
      <Toast />
    </div>
  `,
  setup() {
    return { store };
  }
};

const app = createApp(App);
app.mount('#app-root');
