<template>
  <transition name="modal">
    <div v-if="store.userGuideVisible"
      class="fixed inset-0 z-[55] flex items-center justify-center p-4"
      style="background: var(--bg-overlay);"
      @click.self="store.closeUserGuide()"
      role="dialog"
      aria-modal="true"
      aria-label="使用指南">
      <div class="w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col"
        style="background: var(--bg-elevated); border: 1px solid var(--border-default); max-height: 85vh;">

        <!-- Header: 标题 + 关闭 -->
        <div class="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style="border-color: var(--border-default);">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style="color: var(--color-accent);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <h3 class="text-lg font-semibold" style="color: var(--text-primary);">
              QuickMark 使用指南
            </h3>
            <span class="text-xs px-1.5 py-0.5 rounded font-mono"
              style="background: var(--bg-input); color: var(--text-tertiary);"
              v-text="`v${VERSION}`"></span>
          </div>
          <button class="btn btn-icon-sm btn-ghost" @click="store.closeUserGuide()" aria-label="关闭">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body: 左侧目录 + 右侧内容 -->
        <div class="flex flex-1 min-h-0">

          <!-- 左侧目录 -->
          <nav class="w-48 flex-shrink-0 border-r overflow-y-auto panel-scroll"
            style="border-color: var(--border-default);"
            aria-label="指南目录">
            <ul class="py-2">
              <li v-for="ch in chapters" :key="ch.id">
                <a :href="`#guide-${ch.id}`"
                  class="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                  :class="activeChapter === ch.id ? 'guide-toc-active' : 'guide-toc-idle'"
                  @click.prevent="scrollToChapter(ch.id)">
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style="color: var(--text-tertiary);">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="ch.icon"/>
                  </svg>
                  <span class="truncate" v-text="ch.title"></span>
                </a>
              </li>
            </ul>
          </nav>

          <!-- 右侧内容 (scroll) -->
          <div ref="contentRef"
            class="flex-1 overflow-y-auto panel-scroll px-8 py-6"
            @scroll.passive="onContentScroll">

            <!-- 公告 (默认关闭, 大版本时启用) -->
            <div v-if="ANNOUNCEMENT.enabled"
              class="mb-6 p-3 rounded-lg"
              :style="announcementStyle">
              <p class="text-sm" v-text="ANNOUNCEMENT.text"></p>
            </div>

            <!-- 章节 -->
            <article v-for="ch in chapters" :key="ch.id"
              :id="`guide-${ch.id}`"
              class="mb-8 last:mb-4 scroll-mt-2">

              <!-- 章节标题 -->
              <h2 class="text-xl font-bold flex items-center gap-2 mb-4 pb-2 border-b"
                style="color: var(--text-primary); border-color: var(--border-default);">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style="color: var(--color-accent);">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="ch.icon"/>
                </svg>
                <span v-text="ch.title"></span>
              </h2>

              <!-- 分组 -->
              <div v-for="(sec, i) in ch.sections" :key="i" class="mb-5 last:mb-0">
                <h3 class="text-sm font-semibold uppercase tracking-wider mb-2"
                  style="color: var(--text-tertiary);" v-text="sec.heading"></h3>

                <ul class="space-y-2">
                  <li v-for="(item, j) in sec.items" :key="j"
                    class="text-sm leading-relaxed">
                    <div class="flex items-start gap-2">
                      <span class="font-medium flex-shrink-0 min-w-[3.5rem]"
                        style="color: var(--text-primary);"
                        v-text="item.label"></span>
                      <span class="flex-1"
                        style="color: var(--text-secondary);"
                        v-html="item.desc"></span>
                      <!-- 可交互按钮 (新手引导用, 点了关指南 + 触发对应功能) -->
                      <button v-if="item.action"
                        class="btn btn-sm btn-primary flex-shrink-0"
                        @click="runAction(item.action.id)">
                        {{ item.action.label }}
                      </button>
                    </div>
                    <!-- 快捷键 (可选) -->
                    <div v-if="item.keys && item.keys.length" class="flex items-center gap-1 mt-1 ml-[3.5rem]">
                      <kbd v-for="(k, ki) in item.keys" :key="ki"
                        class="px-1.5 py-0.5 rounded text-xs font-mono"
                        style="background: var(--bg-input); border: 1px solid var(--border-default); color: var(--text-secondary);"
                        v-text="k"></kbd>
                    </div>
                    <!-- 单条 tip (可选) -->
                    <div v-if="item.tip"
                      class="mt-1.5 ml-[3.5rem] px-2.5 py-1.5 rounded text-xs"
                      style="background: var(--bg-input); color: var(--text-secondary); border-left: 2px solid var(--color-accent);"
                      v-text="item.tip"></div>
                  </li>
                </ul>

                <!-- 整段 tip (在分组底部) -->
                <div v-if="sec.tip"
                  class="mt-3 px-3 py-2 rounded text-xs"
                  style="background: var(--bg-input); color: var(--text-secondary); border-left: 2px solid var(--color-accent);"
                  v-text="sec.tip"></div>
              </div>
            </article>

            <!-- 底部 footer -->
            <div class="mt-8 pt-4 border-t text-center text-xs"
              style="border-color: var(--border-default); color: var(--text-tertiary);">
              <p>新增功能请同步更新本指南，源文件: src/data/guide-content.js</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { store } from '@/store';
import { chapters, ANNOUNCEMENT, VERSION } from '@/data/guide-content.js';

const contentRef = ref(null);
const activeChapter = ref(chapters[0]?.id);

// 公告样式 (按 type 走, 公告默认 enabled=false 不显示)
const announcementStyle = computed(() => {
  if (!ANNOUNCEMENT.enabled) return '';
  const map = {
    info: 'background: var(--color-accent-subtle); border-left: 3px solid var(--color-accent);',
    warning: 'background: #FEF3C7; border-left: 3px solid #F59E0B;',
    success: 'background: #D1FAE5; border-left: 3px solid #10B981;'
  };
  return map[ANNOUNCEMENT.type] || map.info;
});

// 滚到指定章节
function scrollToChapter(id) {
  if (!contentRef.value) return;
  const el = contentRef.value.querySelector(`#guide-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    activeChapter.value = id;
  }
}

// 指南内可交互按钮: 点了关闭指南 + 触发对应功能
// 新增 action: 在此处 actionHandlers 加分支
function runAction(actionId) {
  // 先关指南, 让用户看到主界面的对应操作
  store.closeUserGuide();
  // nextTick 等指南消失后再触发, 避免焦点冲突
  nextTick(() => {
    if (actionId === 'openNewCategory') {
      store.showNewCategoryDialog = true;
    } else if (actionId === 'createNote') {
      // v1.1: 改成 openNewNoteDialog, 弹层里选分类再建
      store.openNewNoteDialog();
    } else if (actionId === 'focusSearch') {
      document.querySelector('[data-note-search-input]')?.focus();
    } else if (actionId === 'focusCategorySearch') {
      document.querySelector('[data-category-search-input]')?.focus();
    }
  });
}

// 滚动时更新左侧目录高亮
function onContentScroll(e) {
  const container = e.target;
  const anchors = chapters.map(c => container.querySelector(`#guide-${c.id}`)).filter(Boolean);
  if (anchors.length === 0) return;
  const threshold = container.scrollTop + 80;
  let cur = chapters[0].id;
  for (const a of anchors) {
    if (a.offsetTop <= threshold) cur = a.id.replace('guide-', '');
    else break;
  }
  activeChapter.value = cur;
}

// 打开时滚到顶部
watch(() => store.userGuideVisible, async (open) => {
  if (open) {
    activeChapter.value = chapters[0]?.id;
    await nextTick();
    if (contentRef.value) contentRef.value.scrollTop = 0;
  }
});
</script>

<style scoped>
.guide-toc-active {
  background-color: var(--bg-active);
  color: var(--color-primary);
  font-weight: 600;
  border-left: 3px solid var(--color-primary);
  padding-left: calc(1rem - 3px);
}
.guide-toc-idle {
  color: var(--text-secondary);
}
.guide-toc-idle:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

/* 弹层过渡 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-slow);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* 指南内 kbd / code 样式 */
:deep(kbd) {
  display: inline-block;
  padding: 1px 6px;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  color: var(--text-secondary);
}
:deep(code) {
  padding: 1px 5px;
  font-size: 0.85em;
  font-family: ui-monospace, monospace;
  background: var(--bg-input);
  border-radius: 3px;
  color: var(--color-accent);
}
</style>
