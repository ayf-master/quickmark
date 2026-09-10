<template>
  <!-- 栏间分隔条: 拖拽调宽, 双击恢复默认 -->
  <div
    class="layout-resizer"
    :class="{ 'is-active': active }"
    :title="title"
    @pointerdown="onPointerDown"
    @dblclick="$emit('reset')">
    <span class="resizer-grip"></span>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 只负责"把指针位移换算成宽度增量"交给父组件, 布局规则由父组件决定
const emit = defineEmits(['resize', 'reset']);

defineProps({
  title: { type: String, default: '拖拽调整宽度 (双击恢复默认)' }
});

const active = ref(false);

function onPointerDown(e) {
  if (e.button != null && e.button !== 0) return;
  e.preventDefault();
  active.value = true;
  let lastX = e.clientX;

  const onMove = (ev) => {
    // 传增量而不是绝对坐标: 父组件用自己的宽度基准累加, 不用关心起始值
    emit('resize', ev.clientX - lastX);
    lastX = ev.clientX;
  };

  const onUp = () => {
    active.value = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}
</script>

<style scoped>
.layout-resizer {
  position: relative;
  flex-shrink: 0;
  width: 7px;
  cursor: col-resize;
  background: var(--border-subtle, transparent);
  transition: background .15s;
  /* 触摸设备上让分隔条好按一点 */
  touch-action: none;
}
.layout-resizer::before {
  /* 加大命中区域, 视觉上仍是细线 */
  content: '';
  position: absolute;
  inset: 0 -3px;
}
.layout-resizer:hover,
.layout-resizer.is-active {
  background: var(--color-primary);
}
.resizer-grip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 24px;
  border-radius: 2px;
  background: var(--border-default);
  opacity: .7;
  pointer-events: none;
}
.layout-resizer:hover .resizer-grip,
.layout-resizer.is-active .resizer-grip {
  background: #fff;
  opacity: .9;
}
</style>
