<template>
  <transition name="modal">
    <div v-if="store.showNewCategoryDialog || store.showEditCategoryDialog"
      class="fixed inset-0 z-[55] flex items-center justify-center p-4"
      style="background: var(--bg-overlay);"
      @click.self="store.cancelCategoryDialog()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-dialog-title"
      @keydown.escape="store.cancelCategoryDialog()">
      <div class="w-full max-w-md rounded-2xl shadow-xl p-6"
        style="background: var(--bg-elevated); border: 1px solid var(--border-default);">
        <h3 id="category-dialog-title" class="text-lg font-semibold mb-5"
          style="color: var(--text-primary);">
          {{ store.showEditCategoryDialog ? '编辑分类' : '新建分类' }}
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--text-secondary);">名称</label>
            <input type="text" v-model="store.categoryForm.name"
              @keyup.enter="store.saveCategory()"
              ref="nameInput"
              placeholder="分类名称"
              class="input" />
          </div>

          <div>
            <label class="block text-sm mb-1.5" style="color: var(--text-secondary);">
              父级分类
              <span class="text-xs ml-1" style="color: var(--text-tertiary);">(不选则为顶级)</span>
            </label>
            <select v-model="store.categoryForm.parent_id"
              class="input"
              aria-label="选择父级分类">
              <option :value="null">— 顶级分类 —</option>
              <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id"
                v-text="'　'.repeat(opt.depth) + (opt.depth > 0 ? '└ ' : '') + opt.name"></option>
            </select>
          </div>

          <div>
            <label class="block text-sm mb-1.5" style="color: var(--text-secondary);">颜色</label>
            <div class="flex items-center gap-3">
              <input type="color" v-model="store.categoryForm.color"
                class="w-10 h-10 rounded-lg cursor-pointer" />
              <span class="text-xs font-mono" style="color: var(--text-tertiary);"
                v-text="store.categoryForm.color"></span>
              <div class="flex-1"></div>
              <div class="flex gap-1.5">
                <button v-for="c in presetColors" :key="c" @click="store.categoryForm.color = c"
                  class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  :style="{
                    backgroundColor: c,
                    borderColor: store.categoryForm.color === c ? 'var(--text-primary)' : 'transparent'
                  }"
                  :aria-label="'选择颜色 ' + c"></button>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button class="btn btn-ghost" @click="store.cancelCategoryDialog()">取消</button>
          <button class="btn btn-primary" @click="store.saveCategory()">保存</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { store } from '@/store';

const presetColors = ['#5B8DEF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];
const nameInput = ref(null);

// 父级下拉选项: 展平树,排除自身及后代 (编辑时防循环)
const parentOptions = computed(() => {
  const editingId = store.editingCategoryId;
  let excluded = new Set();
  if (editingId) {
    excluded = new Set(store.getDescendantIdsFlat(editingId));
  }
  const flat = [];
  function walk(nodes) {
    for (const n of nodes) {
      if (!excluded.has(n.id)) {
        flat.push({ id: n.id, name: n.name, depth: n.depth });
      }
      if (n.children) walk(n.children);
    }
  }
  walk(store.categoryTree);
  return flat;
});

watch(
  () => store.showNewCategoryDialog || store.showEditCategoryDialog,
  (open) => {
    if (open) nextTick(() => nameInput.value?.focus());
  }
);
</script>
