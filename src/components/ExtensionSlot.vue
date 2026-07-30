<template>
  <!-- 插槽渲染器: 在指定位置渲染所有挂载到此 slot 的拓展组件 -->
  <div v-if="hasContent" :class="['extension-slot', `slot-${name}`]">
    <component
      v-for="(comp, idx) in components"
      :key="'ext-' + idx"
      :is="comp"
      v-bind="mergedProps"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getSlotComponents, getSlotProps, hasSlotContent } from '@/store/features.js';

const props = defineProps({
  /** 插槽名: 与 featureManifest 中 slot 字段对应 */
  name: { type: String, required: true }
});

const components = computed(() => getSlotComponents(props.name));
const mergedProps = computed(() => getSlotProps(props.name));
const hasContent = computed(() => hasSlotContent(props.name));
</script>
