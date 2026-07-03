<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="visible" class="fixed inset-0 z-[70] flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.45);"
        @click.self="close">
        <div class="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          :style="{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }">
          <div class="h-1 w-full" style="background: linear-gradient(90deg, var(--color-accent), #f59e0b);"></div>
          <div class="px-6 pt-6 pb-5">
            <h2 class="text-lg font-bold mb-1" style="color: var(--text-primary);">意见反馈</h2>
            <p class="text-xs mb-4" style="color: var(--text-tertiary);">帮助我们改进 QuickMark</p>

            <textarea v-model="content" rows="4"
              class="input w-full resize-none text-sm"
              :style="{ background: 'var(--bg-panel)' }"
              placeholder="请描述你的建议或遇到的问题..."></textarea>

            <input v-model="contact" type="text"
              class="input w-full mt-3 text-sm"
              placeholder="联系方式（选填）" />

            <p v-if="error" class="text-xs mt-2" style="color: var(--color-danger);">{{ error }}</p>
          </div>
          <div class="flex items-center justify-between px-6 pb-5">
            <button class="text-sm px-3 py-1.5 rounded-lg" style="color: var(--text-tertiary);"
              @click="close">取消</button>
            <button class="text-sm px-5 py-2 rounded-lg font-medium text-white"
              :disabled="submitting || !content.trim()"
              :style="{ background: submitting ? 'var(--text-tertiary)' : 'var(--color-accent)' }"
              @click="submit">
              {{ submitting ? '提交中...' : '提交反馈' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import API from '@/api/index.js';

const props = defineProps({ visible: Boolean });
const emit = defineEmits(['close']);

const content = ref('');
const contact = ref('');
const submitting = ref(false);
const error = ref('');

watch(() => props.visible, (v) => {
  if (v) { content.value = ''; contact.value = ''; error.value = ''; }
});

function close() { emit('close'); }

async function submit() {
  if (!content.value.trim()) return;
  submitting.value = true;
  error.value = '';
  try {
    await API.submitFeedback({ content: content.value, contact: contact.value });
    content.value = '';
    contact.value = '';
    emit('close');
  } catch (e) {
    error.value = e.message || '提交失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.tour-fade-enter-active, .tour-fade-leave-active { transition: opacity 0.2s ease; }
.tour-fade-enter-from, .tour-fade-leave-to { opacity: 0; }
</style>
