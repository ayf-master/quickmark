<template>
  <button class="btn btn-icon btn-ghost"
    @click="store.toggleTheme()"
    :aria-label="store.theme === 'light' ? '切换到深色模式' : '切换到浅色模式'"
    :title="store.theme === 'light' ? '切换深色' : '切换浅色'">
    <!-- 月亮(浅色模式时显示,点击切到深色) -->
    <svg v-if="store.theme === 'light'" class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      style="transition: transform .3s ease;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
    </svg>
    <!-- 太阳(深色模式时显示) -->
    <svg v-else class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      style="transition: transform .3s ease;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
    </svg>
  </button>
</template>

<script setup>
import { store } from '@/store';
</script>
