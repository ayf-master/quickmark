<template>
  <transition name="modal">
    <div v-if="store.preferencePanelVisible"
      class="fixed inset-0 z-[55] flex items-center justify-center p-4"
      style="background: var(--bg-overlay);"
      @click.self="store.preferencePanelVisible = false"
      role="dialog"
      aria-modal="true"
      aria-label="个人偏好"
      @keydown.escape="store.preferencePanelVisible = false">
      <div class="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
        style="background: var(--bg-elevated); border: 1px solid var(--border-default);">
        <div class="flex items-center justify-between px-6 py-5 border-b"
          style="border-color: var(--border-default);">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary);">个人偏好</h3>
          <button class="btn btn-icon-sm btn-ghost" @click="store.preferencePanelVisible = false" aria-label="关闭">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="px-6 py-5">

          <!-- 默认编辑器 -->
          <div class="mb-6 last:mb-0">
            <p class="text-sm font-semibold mb-3" style="color: var(--text-primary);">默认编辑器</p>
            <p class="text-xs mb-3" style="color: var(--text-tertiary);">打开笔记时默认显示哪个编辑器</p>
            <div class="flex flex-col gap-2">
              <label
                class="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                :style="{
                  background: store.defaultEditMode === 'auto' ? 'var(--color-accent-subtle, rgba(91,141,239,0.1))' : 'var(--bg-input)',
                  border: store.defaultEditMode === 'auto' ? '1.5px solid var(--color-accent)' : '1px solid var(--border-default)'
                }"
                @mouseenter="(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'"
                @mouseleave="(e) => { if (store.defaultEditMode !== 'auto') e.currentTarget.style.borderColor = 'var(--border-default)'; }">
                <input type="radio" name="defaultMode" value="auto"
                  :checked="store.defaultEditMode === 'auto'"
                  @change="store.setDefaultEditMode('auto')"
                  class="accent-current">
                <div>
                  <div class="text-sm font-medium" style="color: var(--text-primary);">自动检测</div>
                  <div class="text-xs mt-0.5" style="color: var(--text-tertiary);">有 HTML 标签进 Markdown，否则纯文本</div>
                </div>
              </label>
              <label
                class="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                :style="{
                  background: store.defaultEditMode === 'markdown' ? 'var(--color-accent-subtle, rgba(91,141,239,0.1))' : 'var(--bg-input)',
                  border: store.defaultEditMode === 'markdown' ? '1.5px solid var(--color-accent)' : '1px solid var(--border-default)'
                }"
                @mouseenter="(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'"
                @mouseleave="(e) => { if (store.defaultEditMode !== 'markdown') e.currentTarget.style.borderColor = 'var(--border-default)'; }">
                <input type="radio" name="defaultMode" value="markdown"
                  :checked="store.defaultEditMode === 'markdown'"
                  @change="store.setDefaultEditMode('markdown')"
                  class="accent-current">
                <div>
                  <div class="text-sm font-medium" style="color: var(--text-primary);">Markdown</div>
                  <div class="text-xs mt-0.5" style="color: var(--text-tertiary);">始终以 Markdown + 预览模式打开</div>
                </div>
              </label>
              <label
                class="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                :style="{
                  background: store.defaultEditMode === 'plain' ? 'var(--color-accent-subtle, rgba(91,141,239,0.1))' : 'var(--bg-input)',
                  border: store.defaultEditMode === 'plain' ? '1.5px solid var(--color-accent)' : '1px solid var(--border-default)'
                }"
                @mouseenter="(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'"
                @mouseleave="(e) => { if (store.defaultEditMode !== 'plain') e.currentTarget.style.borderColor = 'var(--border-default)'; }">
                <input type="radio" name="defaultMode" value="plain"
                  :checked="store.defaultEditMode === 'plain'"
                  @change="store.setDefaultEditMode('plain')"
                  class="accent-current">
                <div>
                  <div class="text-sm font-medium" style="color: var(--text-primary);">纯文本</div>
                  <div class="text-xs mt-0.5" style="color: var(--text-tertiary);">始终以纯文本模式打开</div>
                </div>
              </label>
            </div>
          </div>

        </div>
        <div class="flex justify-end px-6 py-4 border-t"
          style="border-color: var(--border-default);">
          <button class="btn btn-secondary text-sm" @click="store.preferencePanelVisible = false">
            关闭
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { store } from '@/store';
</script>
