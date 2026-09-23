<template>
  <article
    @click="$emit('select', note)"
    @keydown.enter="$emit('select', note)"
    tabindex="0"
    role="button"
    :aria-label="'打开笔记: ' + (note.title || '无标题')"
    class="card cursor-pointer p-4 group"
    :class="{
      'is-selected': isSelected,
      'is-due-review': isDue
    }"
    style="margin-bottom: 10px; position: relative;">
    <!-- 到期复习标记 -->
    <span v-if="isDue" class="due-badge" title="到期复习">🔄</span>
    <!-- 移动笔记到分类 (仅手机端显示): 打开全屏分类页选择模式 -->
    <button v-if="store.isMobile"
      @click.stop="openMovePicker"
      class="card-move-btn"
      :aria-label="'移动笔记 ' + (note.title || '无标题') + ' 到分类'"
      title="移动到分类">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11v4m0 0l-1.5-1.5M12 15l1.5-1.5"/>
      </svg>
    </button>

    <!-- 删除按钮 (hover 出现) -->
    <button
      @click.stop="confirmDelete"
      @keydown.enter.stop="confirmDelete"
      class="card-delete-btn"
      :aria-label="'删除笔记 ' + (note.title || '无标题')"
      title="删除笔记">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    </button>

    <div class="flex items-start gap-2 mb-1.5 pr-6">
      <!-- 置顶图标 -->
      <svg v-if="note.is_pinned" class="w-3.5 h-3.5 mt-1 flex-shrink-0"
        fill="currentColor" viewBox="0 0 24 24"
        style="color: var(--color-accent);">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
      </svg>
      <h3 class="flex-1 min-w-0 text-base font-semibold truncate"
        style="color: var(--text-primary);"
        v-text="note.title || '无标题'"></h3>
    </div>
    <p class="text-sm line-clamp-2 leading-relaxed mb-3"
      style="color: var(--text-secondary); overflow-wrap: anywhere;"
      v-text="(note.content ? store.stripHtml(note.content) : '') || '无内容'"></p>
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs flex-shrink-0"
        style="color: var(--text-tertiary);"
        v-text="store.formatTime(note.updated_at)"></span>
      <!-- min-w-0: 允许 flex 子项收缩; 标签超出时省略号截断, 防止撑宽卡片/列表 -->
      <div class="flex items-center gap-1.5 flex-wrap justify-end min-h-[18px] min-w-0">
        <span v-for="cname in (note.category_names || [])" :key="cname"
          class="text-xs px-2 py-0.5 rounded-full card-cat-tag"
          style="background: var(--bg-hover); color: var(--text-secondary);"
          v-text="cname"></span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { store } from '@/store';

const props = defineProps({
  note: { type: Object, required: true },
  isSelected: { type: Boolean, default: false },
  isDue: { type: Boolean, default: false }
});

const emit = defineEmits(['select', 'delete']);

// 手机端: 打开全屏分类页的"选择模式", 为当前笔记挑选目标分类
function openMovePicker() {
  store.mobileCategoryPickNoteId = props.note.id;
  store.mobileCategoryPageOpen = true;
}

function confirmDelete(e) {
  const title = props.note.title || '无标题';
  if (!confirm(`确定删除笔记「${title}」吗?`)) return;
  emit('delete', props.note);
}
</script>

<style scoped>
.card.is-selected {
  background: var(--bg-active) !important;
  box-shadow: 0 0 0 2px var(--color-primary-border), var(--shadow-sm) !important;
}
.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
/* 卡片右上角删除按钮: 触摸设备常显; 鼠标设备 hover 卡片时显示 */
.card-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-tertiary);
  opacity: 1;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  cursor: pointer;
  border: none;
}
.card-delete-btn:hover {
  background: var(--color-danger-subtle, #FEE2E2);
  color: var(--color-danger, #DC2626);
}
/* 移动端"移动到分类"按钮: 位于删除按钮左侧; v-if="store.isMobile" 控制仅手机渲染 */
.card-move-btn {
  position: absolute;
  top: 8px;
  right: 40px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-tertiary);
  opacity: 1;
  cursor: pointer;
  border: none;
}
.card-move-btn:active {
  background: var(--color-primary-subtle, rgba(91,110,245,0.12));
  color: var(--color-primary);
}
/* 仅有鼠标的设备: 恢复悬停显示, 避免常显按钮干扰视觉 */
@media (hover: hover) and (pointer: fine) {
  .card-delete-btn {
    opacity: 0;
  }
  .card:hover .card-delete-btn,
  .card:focus-within .card-delete-btn {
    opacity: 1;
  }
}

/* 分类标签: 超长时省略, 避免把卡片/列表撑出屏幕 */
.card-cat-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 间隔重复到期高亮 ===== */
.due-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 14px;
  line-height: 1;
  z-index: 1;
  opacity: 1;
  transition: opacity .15s;
  pointer-events: none;
}
/* 仅有鼠标的设备: 悬停卡片才显示到期标记 */
@media (hover: hover) and (pointer: fine) {
  .due-badge {
    opacity: 0;
  }
  .card:hover .due-badge,
  .card:focus-within .due-badge {
    opacity: 1;
  }
}
.is-due-review {
  border-left: 3px solid var(--color-accent, #5b6ef5) !important;
  background: var(--color-primary-subtle, rgba(91,110,245,0.04));
}
</style>
