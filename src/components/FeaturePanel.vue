<template>
  <div class="relative" ref="rootRef">
    <!-- 齿轮按钮 (右上角「扩展功能」入口) -->
    <button
      class="btn btn-icon btn-ghost"
      @click="open = !open"
      aria-label="扩展功能"
      title="扩展功能"
      :style="open ? 'background: var(--bg-panel)' : ''">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--text-primary);">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <span v-if="pending > 0" class="badge">{{ pending > 99 ? '99+' : pending }}</span>
    </button>

    <!-- 下拉面板 -->
    <Transition name="fade">
      <div v-if="open"
        class="absolute right-0 mt-1 w-80 rounded-lg shadow-lg z-50 p-3"
        style="background: var(--bg-elevated); border: 1px solid var(--border-default);">
        <div class="text-sm font-semibold mb-1" style="color: var(--text-primary);">扩展功能</div>
        <p class="text-xs mb-2" style="color: var(--text-tertiary);">按需开启，默认关闭。开启后才会出现在界面里。</p>

        <div v-for="f in manifest" :key="f.id"
          class="py-2 border-b last:border-0"
          style="border-color: var(--border-default);">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm font-medium" style="color: var(--text-primary);">{{ f.title }}</div>
              <div class="text-xs mt-0.5 leading-snug" style="color: var(--text-tertiary);">{{ f.desc }}</div>
            </div>
            <button class="toggle" :class="{ on: features[f.id] }"
              @click="toggle(f)" role="switch" :aria-checked="features[f.id]" :aria-label="f.title + ' 开关'">
              <span class="knob"></span>
            </button>
          </div>
          <button v-if="features[f.id]" class="text-xs mt-2 underline" style="color: var(--color-accent);" @click="openFeature(f)">打开</button>
        </div>
      </div>
    </Transition>

    <!-- 功能抽屉 (懒加载组件) -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="activeComp" class="feature-drawer">
          <div class="drawer-head">
            <span class="text-sm font-semibold" style="color: var(--text-primary);">{{ activeTitle }}</span>
            <button class="btn btn-icon btn-ghost" @click="closeFeature" aria-label="关闭">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="drawer-body">
            <component :is="activeComp" :title="activeTitle" :desc="activeDesc" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue';
import { defineAsyncComponent } from 'vue';
import { features, setFeature } from '@/store/features.js';
import { featuresManifest } from '@/featureManifest.js';
import API from '@/api/index.js';

const manifest = featuresManifest;
const open = ref(false);
const rootRef = ref(null);
const activeComp = shallowRef(null);
const activeTitle = ref('');
const activeDesc = ref('');
const pending = ref(0);  // 间隔重复待复习数 (齿轮角标)

async function refreshPending() {
  if (!features.spacedRepetition) { pending.value = 0; return; }
  try {
    const d = await API.getReviewQueue();
    pending.value = (d.today || []).length;
  } catch (e) { /* 功能关 / 未就绪时不显示角标 */ }
}

function toggle(f) {
  const next = !features[f.id];
  setFeature(f.id, next);
  // 开启后自动弹出抽屉 (丝滑: 拨开关即见功能), 等下拉面板收起再开
  if (next) setTimeout(() => openFeature(f), 220);
}

function openFeature(f) {
  activeTitle.value = f.title;
  activeDesc.value = f.desc;
  // loader 是 () => import(...), defineAsyncComponent 会触发分包懒加载
  activeComp.value = defineAsyncComponent(f.loader);
  open.value = false;
  if (f.id === 'spacedRepetition') refreshPending();
}

function closeFeature() {
  activeComp.value = null;
}

function onClickOutside(e) {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false;
  }
}
onMounted(() => { document.addEventListener('click', onClickOutside); refreshPending(); });
onUnmounted(() => document.removeEventListener('click', onClickOutside));
// 开关变化即时同步角标
watch(() => features.spacedRepetition, () => refreshPending());
</script>

<style scoped>
.toggle {
  width: 36px; height: 20px; border-radius: 999px;
  background: var(--border-default); position: relative; flex-shrink: 0;
  transition: background .2s; cursor: pointer; border: none; padding: 0;
}
.toggle.on { background: var(--color-accent); }
.toggle .knob {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: transform .2s;
}
.toggle.on .knob { transform: translateX(16px); }

.badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 999px; background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
  border: 2px solid var(--bg-elevated);
}

.feature-drawer {
  position: fixed; top: 0; right: 0; height: 100vh; width: 380px; max-width: 90vw;
  background: var(--bg-elevated); border-left: 1px solid var(--border-default);
  box-shadow: -8px 0 24px rgba(0, 0, 0, .12); z-index: 100;
  display: flex; flex-direction: column;
}
.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border-default);
}
.drawer-body { flex: 1; overflow: auto; }

.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform .25s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }
</style>
