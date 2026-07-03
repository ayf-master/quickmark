<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="visible" class="fixed inset-0 z-[70] flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.45);"
        @click.self="close">
        <div class="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          :style="{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }"
          style="max-height: 80vh;">
          <div class="h-1 w-full" style="background: linear-gradient(90deg, #f59e0b, var(--color-accent));"></div>
          <div class="px-6 pt-6 pb-3 flex items-center justify-between">
            <h2 class="text-lg font-bold" style="color: var(--text-primary);">反馈管理</h2>
            <button class="btn btn-icon-sm btn-ghost" @click="close" aria-label="关闭">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="px-6 pb-4 flex-1 overflow-y-auto" style="max-height: calc(80vh - 80px);">
            <div v-if="loading" class="text-center py-8 text-sm" style="color: var(--text-tertiary);">加载中...</div>
            <div v-else-if="list.length === 0" class="text-center py-8 text-sm" style="color: var(--text-tertiary);">
              暂无反馈
            </div>
            <div v-for="item in list" :key="item.id" class="mb-3 rounded-xl p-4"
              :style="{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)' }">
              <div class="text-sm leading-relaxed" style="color: var(--text-primary);" v-text="item.content"></div>
              <div class="flex items-center justify-between mt-2">
                <div class="flex items-center gap-2 text-xs" style="color: var(--text-tertiary);">
                  <span>{{ item.owner?.displayName || item.owner?.username || '匿名' }}</span>
                  <span>{{ fmtTime(item.createdAt) }}</span>
                  <span v-if="item.contact" style="color: var(--color-accent);">{{ item.contact }}</span>
                </div>
                <button class="text-xs px-2 py-1 rounded" style="color: var(--color-danger);"
                  @click="remove(item.id)">删除</button>
              </div>
            </div>
            <div v-if="total > pageSize" class="flex items-center justify-center gap-3 mt-4 pb-2">
              <button class="text-xs px-3 py-1 rounded" :disabled="page <= 1"
                :style="{ color: page <= 1 ? 'var(--text-tertiary)' : 'var(--color-accent)' }"
                @click="load(page - 1)">上一页</button>
              <span class="text-xs" style="color: var(--text-tertiary);">{{ page }} / {{ maxPage }}</span>
              <button class="text-xs px-3 py-1 rounded" :disabled="page >= maxPage"
                :style="{ color: page >= maxPage ? 'var(--text-tertiary)' : 'var(--color-accent)' }"
                @click="load(page + 1)">下一页</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import API from '@/api/index.js';

const props = defineProps({ visible: Boolean });
const emit = defineEmits(['close']);

const list = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 20;

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

watch(() => props.visible, (v) => {
  if (v) { page.value = 1; load(1); }
});

async function load(p) {
  loading.value = true;
  try {
    const res = await API.getFeedback(p);
    list.value = res.items || [];
    total.value = res.total || 0;
    page.value = res.page || 1;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function remove(id) {
  if (!confirm('确定删除这条反馈？')) return;
  try {
    await API.deleteFeedback(id);
    list.value = list.value.filter(i => i.id !== id);
    total.value--;
  } catch (e) {
    console.error(e);
  }
}

function close() { emit('close'); }

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts.replace(' ', 'T'));
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.tour-fade-enter-active, .tour-fade-leave-active { transition: opacity 0.2s ease; }
.tour-fade-enter-from, .tour-fade-leave-to { opacity: 0; }
</style>
