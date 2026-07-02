<template>
  <transition name="modal">
    <div v-if="store.shortcutPanelVisible"
      class="fixed inset-0 z-[55] flex items-center justify-center p-4"
      style="background: var(--bg-overlay);"
      @click.self="store.shortcutPanelVisible = false"
      role="dialog"
      aria-modal="true"
      aria-label="快捷键帮助"
      @keydown.escape="store.shortcutPanelVisible = false">
      <div class="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
        style="background: var(--bg-elevated); border: 1px solid var(--border-default);">
        <div class="flex items-center justify-between px-6 py-5 border-b"
          style="border-color: var(--border-default);">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary);">键盘快捷键</h3>
          <button class="btn btn-icon-sm btn-ghost" @click="store.shortcutPanelVisible = false" aria-label="关闭">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div v-for="group in groups" :key="group.title" class="mb-5 last:mb-0">
            <p class="text-xs font-semibold uppercase tracking-wider mb-2"
              style="color: var(--text-tertiary);" v-text="group.title"></p>
            <div class="space-y-2">
              <div v-for="item in group.items" :key="item.label"
                class="flex items-center justify-between py-1.5">
                <span class="text-sm" style="color: var(--text-secondary);" v-text="item.label"></span>
                <div class="flex items-center gap-1">
                  <kbd v-for="(k, i) in item.keys" :key="i"
                    class="px-2 py-0.5 rounded text-xs font-mono"
                    style="background: var(--bg-input); border: 1px solid var(--border-default); color: var(--text-secondary);"
                    v-text="k"></kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { store } from '@/store';

const groups = [
  {
    title: '笔记',
    items: [
      { label: '新建笔记 (弹层选分类)', keys: ['Alt', 'N'] },
      { label: '切换收藏状态', keys: ['Ctrl', 'Shift', 'P'] },
      { label: '关闭编辑器', keys: ['Esc'] }
    ]
  },
  {
    title: '编辑器模式',
    items: [
      { label: '切换纯文本模式', keys: ['Ctrl', 'Alt', 'P'] },
      { label: '切换 Markdown 模式', keys: ['Ctrl', 'Alt', 'M'] }
    ]
  },
  {
    title: '导航',
    items: [
      { label: '聚焦笔记搜索框', keys: ['Ctrl', 'K'] },
      { label: '聚焦分类搜索框', keys: ['Ctrl', 'Shift', 'F'] },
      { label: '打开/关闭此面板', keys: ['?'] }
    ]
  },
  {
    title: 'Markdown 快捷语法 (行首输入)',
    items: [
      { label: '一级标题', keys: ['#', 'Space'] },
      { label: '二级 / 三级标题', keys: ['##', 'Space'] },
      { label: '无序列表', keys: ['-', 'Space'] },
      { label: '引用块', keys: ['>', 'Space'] }
    ]
  }
];
</script>
