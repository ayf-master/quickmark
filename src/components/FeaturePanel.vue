<template>
  <div class="relative" ref="rootRef">
    <!-- 「扩展功能」入口: 四宫格图标 (原本是齿轮, 和设置撞脸容易误解) -->
    <button
      class="btn btn-icon btn-ghost"
      @click.stop="open = !open"
      aria-label="扩展功能"
      title="扩展功能"
      :style="open ? 'background: var(--bg-panel)' : ''">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--text-primary);">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke-width="2"/>
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke-width="2"/>
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke-width="2"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13.5v7M13.5 17h7"/>
      </svg>
      <span v-if="pending > 0" class="badge">{{ pending > 99 ? '99+' : pending }}</span>
    </button>

    <!-- 下拉面板 (纯开关管理, 不处理导航) -->
    <Transition name="fade">
      <div v-if="open"
        class="feature-panel-dropdown"
        style="background: var(--bg-elevated); border: 1px solid var(--border-default);">
        <div class="panel-header">
          <span class="panel-title">扩展功能</span>
          <span class="panel-subtitle">按需开启，即开即用</span>
        </div>

        <div class="panel-body">
          <div
            v-for="f in manifest" :key="f.id"
            class="feature-row">
            <div class="feature-info">
              <div class="feature-name">
                {{ f.title }}
                <span v-if="f.available === false" class="badge-dev">开发中</span>
                <span v-else-if="features[f.id]" class="badge-active">已激活</span>
              </div>
              <div class="feature-desc">{{ f.desc }}</div>
            </div>
            <div class="feature-actions">
              <button v-if="f.available !== false"
                class="toggle" :class="{ on: features[f.id] }"
                @click="toggle(f)"
                role="switch" :aria-checked="features[f.id]"
                :aria-label="f.title + ' 开关'">
                <span class="knob"></span>
              </button>
              <span v-else class="toggle disabled">
                <span class="knob"></span>
              </span>
            </div>
          </div>
        </div>

        <div v-if="activeCount > 0" class="panel-footer">
          <span class="active-hint">已激活 {{ activeCount }} 项功能</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { features, setFeature, flushFeatures } from '@/store/features.js';
import { featuresManifest } from '@/featureManifest.js';
import API from '@/api/index.js';

const manifest = featuresManifest;
const open = ref(false);
const rootRef = ref(null);
const pending = ref(0);

const activeCount = computed(() => manifest.filter(f => features[f.id] && f.available).length);

async function refreshPending() {
  if (!features.spacedRepetition) { pending.value = 0; return; }
  try {
    const d = await API.getDueNotes();
    pending.value = (d && d.count) || 0;
  } catch (e) { /* 功能关 / 未就绪时不显示角标 */ }
}

async function toggle(f) {
  const next = !features[f.id];
  setFeature(f.id, next);

  // 仅做持久化和数据准备, 不导航
  if (next && f.id === 'spacedRepetition') {
    try { await flushFeatures(); } catch (e) { /* ignore */ }
    try { await API.enrollReview(); } catch (e) { /* ignore */ }
    await refreshPending();
  }
}

function onClickOutside(e) {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false;
  }
}

onMounted(async () => {
  document.addEventListener('click', onClickOutside);
  if (features.spacedRepetition) {
    try { await API.enrollReview(); } catch (e) { /* ignore */ }
  }
  refreshPending();
});

onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>

<style scoped>
/* ===== 下拉面板 ===== */
.feature-panel-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  width: 320px;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  z-index: 50;
  overflow: hidden;
}
/* 手机: 齿轮按钮居中, absolute 面板会向左溢出屏幕;
   改为 fixed 贴屏幕右缘, 从头部下方弹出, 超长可滚动
   (平板 721-1024px 空间足够, 保持按钮下方下拉) */
@media (max-width: 720px) {
  .feature-panel-dropdown {
    position: fixed;
    top: 56px;
    right: 8px;
    width: min(320px, calc(100vw - 16px));
    max-height: calc(100vh - 70px);
    overflow-y: auto;
  }
}
.panel-header {
  padding: 14px 16px 8px;
  border-bottom: 1px solid var(--border-default);
}
.panel-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.panel-subtitle {
  display: block;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.panel-body {
  padding: 4px 0;
}
.panel-footer {
  padding: 8px 16px 10px;
  border-top: 1px solid var(--border-default);
}
.active-hint {
  font-size: 11px;
  color: var(--color-accent);
}

/* ===== 功能行 ===== */
.feature-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  transition: background 0.15s;
}
.feature-row:hover {
  background: var(--bg-panel);
}
.feature-info {
  flex: 1;
  min-width: 0;
}
.feature-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.feature-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.4;
}
.feature-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* ===== Badges ===== */
.badge-dev {
  display: inline-block;
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 4px;
  background: var(--bg-panel);
  color: var(--text-tertiary);
  border: 1px solid var(--border-default);
  line-height: 1.4;
}
.badge-active {
  display: inline-block;
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 4px;
  background: var(--color-success-subtle, #e8f6ee);
  color: var(--color-success, #1a7f4b);
  line-height: 1.4;
}

/* ===== Toggle switch ===== */
.toggle {
  width: 34px; height: 18px; border-radius: 999px;
  background: var(--border-default); position: relative; flex-shrink: 0;
  transition: background .2s; cursor: pointer; border: none; padding: 0;
}
.toggle.on { background: var(--color-accent); }
.toggle .knob {
  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  border-radius: 50%; background: #fff; transition: transform .2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.toggle.on .knob { transform: translateX(16px); }
.toggle.disabled { cursor: not-allowed; opacity: .5; }

/* ===== Badge (齿轮角标) ===== */
.badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 999px; background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
  border: 2px solid var(--bg-elevated);
}

/* ===== Transitions ===== */
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
