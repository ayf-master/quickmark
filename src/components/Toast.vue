<template>
  <transition name="toast">
    <div v-if="store.toast.show"
      class="fixed bottom-8 left-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2"
      :style="toastStyle"
      role="status"
      aria-live="polite">
      <svg v-if="store.toast.type === 'success'" class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
      </svg>
      <svg v-else class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span v-text="store.toast.message"></span>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue';
import { store } from '@/store';

const toastStyle = computed(() => {
  if (store.toast.type === 'error') {
    return {
      background: 'var(--color-danger-subtle)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-danger)'
    };
  }
  return {
    background: 'var(--color-success-subtle)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success)'
  };
});
</script>
