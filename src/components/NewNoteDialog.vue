<template>
  <transition name="modal">
    <div v-if="store.newNoteDialogOpen"
      class="fixed inset-0 z-[55] flex items-center justify-center p-4"
      style="background: var(--bg-overlay);"
      @click.self="close"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-note-dialog-title"
      @keydown.escape="close">
      <div class="w-full max-w-md rounded-2xl shadow-xl p-6"
        style="background: var(--bg-elevated); border: 1px solid var(--border-default);">
        <h3 id="new-note-dialog-title" class="text-lg font-semibold mb-1"
          style="color: var(--text-primary);">
          新建笔记
        </h3>
        <p class="text-xs mb-5" style="color: var(--text-tertiary);">
          选一个分类放进去,以后也方便找回
        </p>

        <!-- 无分类引导: 先去建分类 -->
        <div v-if="flatCategories.length === 0"
          class="text-center py-6">
          <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style="color: var(--text-tertiary);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          <p class="text-sm mb-1" style="color: var(--text-secondary);">还没有分类</p>
          <p class="text-xs mb-4" style="color: var(--text-tertiary);">先建一个分类再写笔记</p>
          <button class="btn btn-primary" @click="goCreateCategory">新建分类</button>
        </div>

        <template v-else>
          <!-- 分类选择 (下拉,扁平展示含层级缩进) -->
          <div class="mb-4">
            <label class="block text-sm mb-1.5" style="color: var(--text-secondary);">分类</label>
            <select v-model="selectedCategoryId"
              class="input"
              ref="categorySelect"
              aria-label="选择分类">
              <option :value="null" disabled>— 请选择 —</option>
              <option v-for="opt in flatCategories" :key="opt.id" :value="opt.id"
                v-text="'　'.repeat(opt.depth) + (opt.depth > 0 ? '└ ' : '') + opt.name"></option>
            </select>
            <p v-if="triedSubmit && !selectedCategoryId" class="text-xs mt-1"
              style="color: var(--color-danger);">请先选一个分类</p>
          </div>

          <!-- 标题 (可空,默认 "新笔记") -->
          <div class="mb-5">
            <label class="block text-sm mb-1.5" style="color: var(--text-secondary);">
              标题 <span class="text-xs ml-1" style="color: var(--text-tertiary);">(可留空)</span>
            </label>
            <input type="text" v-model="title"
              ref="titleInput"
              @keyup.enter="confirm"
              placeholder="新笔记"
              class="input" />
          </div>

          <div class="flex justify-end gap-3">
            <button class="btn btn-ghost" @click="close">取消</button>
            <button class="btn btn-primary" @click="confirm" :disabled="!selectedCategoryId">创建</button>
          </div>
        </template>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { store } from '@/store';

const selectedCategoryId = ref(null);
const title = ref('');
const triedSubmit = ref(false);

const titleInput = ref(null);
const categorySelect = ref(null);

// 扁平化分类树 (用于下拉选项,带 depth 缩进)
const flatCategories = computed(() => {
  const flat = [];
  function walk(nodes) {
    for (const n of nodes) {
      flat.push({ id: n.id, name: n.name, depth: n.depth });
      if (n.children) walk(n.children);
    }
  }
  walk(store.categoryTree);
  return flat;
});

function reset() {
  selectedCategoryId.value = null;
  title.value = '';
  triedSubmit.value = false;
}

function close() {
  store.newNoteDialogOpen = false;
  reset();
}

function goCreateCategory() {
  // 关掉本弹层, 打开新建分类弹层; 用户建完分类后, 分类列表会刷新,
  // 此时再触发 openNewNoteDialog 即可看到分类选项
  store.newNoteDialogOpen = false;
  reset();
  store.showNewCategoryDialog = true;
}

function confirm() {
  triedSubmit.value = true;
  if (!selectedCategoryId.value) {
    categorySelect.value?.focus();
    return;
  }
  const catId = selectedCategoryId.value;
  const finalTitle = title.value.trim() || '新笔记';
  store.newNoteDialogOpen = false;
  reset();
  // 真正创建笔记, 带 categoryId
  store.createNote(catId, finalTitle);
}

// 弹层打开时: 重置状态, 聚焦到分类下拉
watch(() => store.newNoteDialogOpen, (open) => {
  if (open) {
    reset();
    // 如果有"当前选中分类"且还在分类列表里, 默认选它 (用户友好)
    if (store.selectedCategoryId &&
        flatCategories.value.find(c => c.id === store.selectedCategoryId)) {
      selectedCategoryId.value = store.selectedCategoryId;
    }
    nextTick(() => {
      // 无分类时焦点在"新建分类"按钮, 有分类时在下拉
      if (flatCategories.value.length > 0) {
        categorySelect.value?.focus();
      }
    });
  }
});
</script>
