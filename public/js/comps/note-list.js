// NoteList - 笔记列表面板
const NoteList = {
  components: { NoteCard },
  template: `
    <section class="flex flex-col h-full"
      :style="panelStyle"
      role="region"
      aria-label="笔记列表">
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style="border-bottom: 1px solid var(--border-default);">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold truncate"
            style="color: var(--text-primary);"
            v-text="store.listTitle"></h2>
          <p class="text-xs mt-0.5" style="color: var(--text-tertiary);">
            {{ (Array.isArray(store.filteredNotes) ? store.filteredNotes.length : 0) }} 条笔记
          </p>
        </div>
        <button
          class="btn btn-icon btn-ghost"
          :class="{ 'is-active': store.showPinnedOnly }"
          :title="store.showPinnedOnly ? '显示全部' : '仅显示置顶'"
          :aria-pressed="store.showPinnedOnly"
          aria-label="仅显示置顶笔记"
          @click="store.togglePinnedFilter()">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
            :style="{ color: store.showPinnedOnly ? 'var(--color-accent)' : 'currentColor' }">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
          </svg>
        </button>
      </header>

      <!-- List / Empty -->
      <div class="flex-1 panel-scroll px-4 py-4">
        <template v-if="Array.isArray(store.filteredNotes) && store.filteredNotes.length > 0">
          <NoteCard
            v-for="note in store.filteredNotes"
            :key="note.id"
            :note="note"
            :is-selected="store.editingNote && store.editingNote.id === note.id"
            @select="store.openNote(note)"
            @delete="store.deleteNoteFromList(note)" />
          <div class="h-4"></div>
        </template>
        <template v-else>
          <div class="flex flex-col items-center justify-center text-center px-6"
            style="height: 70%;">
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style="color: var(--text-disabled);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-sm mb-1" style="color: var(--text-secondary);">
              {{ store.searchQuery ? '没有找到匹配的笔记' : '还没有笔记' }}
            </p>
            <p class="text-xs" style="color: var(--text-tertiary);">
              {{ store.searchQuery ? '试试其他关键词' : '请在左侧分类中点击 + 新建笔记' }}
            </p>
          </div>
        </template>
      </div>
    </section>
  `,
  setup() {
    const panelStyle = Vue.computed(() => {
      // 桌面端固定宽度, 平板/移动端占满
      if (store.isDesktop) {
        return {
          width: 'var(--list-width)',
          flexShrink: '0',
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-default)'
        };
      }
      return {
        flex: '1',
        background: 'var(--bg-panel)'
      };
    });
    return { store, panelStyle };
  }
};

// scoped-style for active toggle
(function () {
  const style = document.createElement('style');
  style.textContent = `
    .btn-ghost.is-active {
      background: var(--color-accent-subtle) !important;
      color: var(--color-accent) !important;
    }
  `;
  document.head.appendChild(style);
})();
