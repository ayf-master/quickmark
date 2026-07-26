<template>
  <div class="p-4">
    <div class="text-sm font-medium mb-2" style="color: var(--text-primary);">{{ title }}</div>
    <p class="text-xs leading-relaxed" style="color: var(--text-secondary);">{{ desc }}</p>
    <div class="mt-4 p-3 rounded-md text-xs leading-relaxed" style="background: var(--bg-panel); color: var(--text-tertiary);">
      这是「{{ title }}」的占位演示。开启功能后，它已通过懒加载分包进入页面（未打进主包），并原地出现在界面里——这正是「丝滑切换」的验证点。Phase 1 起这里会被真实功能组件替换。
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  desc: { type: String, default: '' }
});
</script>
