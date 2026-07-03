<template>
  <Teleport to="body">
    <div v-if="store.onboardingVisible" class="tour-root">

      <!-- Step 0: Welcome page (centered card) -->
      <template v-if="store.onboardingStep === 0">
        <div class="tour-mask" @click="store.dismissOnboarding()"></div>
        <div class="tour-card-centered">
          <div class="tour-card-inner" style="width: 400px;" @click.stop>
            <div class="tour-accent-bar"></div>
            <div class="tour-body">
              <div class="tour-step-badge-wrap">
                <span class="tour-step-badge">{{ store.onboardingStep + 1 }} / {{ totalSteps }}</span>
              </div>
              <div class="tour-icon-box">
                <svg class="tour-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="stepDef.icon"/>
                </svg>
              </div>
              <h2 class="tour-title" v-text="stepDef.title"></h2>
              <p class="tour-desc" v-html="stepDef.desc"></p>
              <div v-if="stepDef.tip" class="tour-tip" v-html="stepDef.tip"></div>
            </div>
            <div class="tour-footer">
              <button class="tour-btn-skip" @click="store.dismissOnboarding()">跳过引导</button>
              <div class="tour-btn-group">
                <button class="tour-btn-primary" @click="store.nextOnboardingStep()">
                  下一步
                  <svg class="tour-btn-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Step 1-4: Spotlight + interactive bubble -->
      <template v-else-if="store.onboardingStep < totalSteps - 1">
        <div class="tour-mask-transparent"></div>

        <!-- Spotlight -->
        <div v-if="targetRect" class="tour-spotlight" :class="{ 'tour-spotlight-pulse': isWaitingForAction }" :style="spotlightStyle"></div>

        <!-- Bubble -->
        <Transition name="tour-float">
          <div v-if="tooltipReady" class="tour-float-card" :style="tooltipStyle" :key="'tc-'+store.onboardingStep">
            <div class="tour-step-badge-wrap">
              <span class="tour-step-badge">{{ store.onboardingStep + 1 }} / {{ totalSteps }}</span>
              <div class="tour-dots">
                <span v-for="i in totalSteps" :key="i" class="tour-dot"
                  :class="{
                    'tour-dot-active': i - 1 === store.onboardingStep,
                    'tour-dot-done': i - 1 < store.onboardingStep
                  }"></span>
              </div>
            </div>

            <div class="tour-float-icon-box">
              <svg class="tour-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="stepDef.icon"/>
              </svg>
            </div>

            <h3 class="tour-float-title" v-text="stepDef.title"></h3>
            <p class="tour-desc" v-html="stepDef.desc"></p>

            <!-- Action hint -->
            <div v-if="stepDef.action" class="tour-action-hint">
              <svg class="tour-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
              </svg>
              {{ actionHintText }}
            </div>

            <div v-if="stepDef.tip" class="tour-tip" v-html="stepDef.tip"></div>

            <div class="tour-footer" style="margin-top: 14px;">
              <button class="tour-btn-skip" @click="store.dismissOnboarding()">跳过引导</button>
              <div class="tour-btn-group">
                <button class="tour-btn-secondary" @click="skipStep">
                  跳过此步
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </template>

      <!-- Step 5: Completed -->
      <template v-else>
        <div class="tour-mask" @click="finish"></div>
        <div class="tour-card-centered">
          <div class="tour-card-inner" style="width: 400px;" @click.stop>
            <div class="tour-accent-bar" style="background: linear-gradient(90deg, #22c55e, #16a34a);"></div>
            <div class="tour-body" style="text-align: center;">
              <div class="tour-icon-box" style="background: rgba(34,197,94,0.15);">
                <svg class="tour-icon" style="color: #22c55e;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h2 class="tour-title" v-text="stepDef.title"></h2>
              <p class="tour-desc" v-html="stepDef.desc"></p>
              <div v-if="stepDef.tip" class="tour-tip" v-html="stepDef.tip"></div>
            </div>
            <div class="tour-footer" style="justify-content: center;">
              <button class="tour-btn-primary" @click="finish" style="padding: 10px 32px;">
                <svg class="tour-btn-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                开始使用
              </button>
            </div>
          </div>
        </div>
      </template>

    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { store } from '@/store';
import { ONBOARDING_TOTAL_STEPS } from '@/store';

const totalSteps = ONBOARDING_TOTAL_STEPS; // must be 6

const actionHintText = computed(() => {
  const step = store.onboardingStep;
  if (step === 1) return '在左侧点击一个分类';
  if (step === 2) return '在中间点击一篇笔记';
  if (step === 3) return '在右侧编辑器中输入内容';
  if (step === 4) return '点击用户头像，尝试切换主题或查看快捷键';
  return '完成此操作';
});

// Step definitions
const steps = [
  {
    selector: null,
    icon: 'M12 4v16m8-8H4',
    title: '欢迎使用 QuickMark',
    desc: '轻量级笔记应用，支持 <b>Markdown</b>、<b>树形分类</b>、<b>知识图谱</b>。<br>跟着引导实际操作一遍，快速上手。',
    tip: '按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>/</kbd> 随时查看完整使用指南。'
  },
  {
    selector: '[data-tour="sidebar"]',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    title: '浏览分类',
    desc: '点击左侧 <b>任意一个分类</b>，查看该分类下的笔记。',
    action: 'category',
    tip: '分类支持多级嵌套，悬停后点 "+" 可创建子分类。'
  },
  {
    selector: '[data-tour="note-list"]',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    title: '打开笔记',
    desc: '在笔记列表中 <b>点击一篇笔记</b>，右侧编辑器会打开它。',
    action: 'note',
    tip: '笔记支持拖拽排序，点击大头针图标可收藏。'
  },
  {
    selector: '[data-tour="editor"]',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    title: '开始写作',
    desc: '在编辑器中 <b>输入一些文字</b>，内容会自动保存。',
    action: 'content',
    tip: '支持 Markdown 语法，可切换编辑模式。'
  },
  {
    selector: '[data-tour="user-menu"]',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    title: '探索更多功能',
    desc: '点击右上角 <b>用户头像</b>，试试切换主题或查看快捷键。',
    action: 'theme',
    tip: '<kbd>Alt</kbd>+<kbd>N</kbd> 新建笔记 · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> 收藏切换'
  },
  {
    // Step 5: Done (no action)
    selector: null,
    icon: 'M5 13l4 4L19 7',
    title: '已完成新手引导',
    desc: '你已经掌握了 QuickMark 的基本操作。<br>需要帮助时，随时查看使用指南。',
    tip: '按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>/</kbd> 打开完整使用指南'
  }
];

const stepDef = computed(() => steps[store.onboardingStep] || steps[0]);
const isWaitingForAction = computed(() => {
  const s = store.onboardingStep;
  return s >= 1 && s <= 4;
});

// Spotlight positioning
const targetRect = ref(null);
const tooltipReady = ref(false);
const tooltipW = ref(360);
const tooltipH = ref(320);

const spotlightStyle = computed(() => {
  if (!targetRect.value) return { display: 'none' };
  const r = targetRect.value;
  return {
    top: r.top + 'px',
    left: r.left + 'px',
    width: r.width + 'px',
    height: r.height + 'px',
    borderRadius: '8px'
  };
});

const tooltipStyle = computed(() => {
  if (!targetRect.value && store.onboardingStep > 0 && store.onboardingStep < totalSteps - 1) {
    return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }
  if (!targetRect.value) return {};
  const r = targetRect.value;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 14;
  const w = tooltipW.value;
  const h = tooltipH.value;

  // Try below first
  if (r.bottom + gap + h <= vh - 20) {
    let left = Math.max(16, Math.min(vw - w - 16, r.left + r.width / 2 - w / 2));
    return { top: r.bottom + gap + 'px', left: left + 'px', transform: 'none' };
  }
  // Try above
  if (r.top - gap - h >= 20) {
    let left = Math.max(16, Math.min(vw - w - 16, r.left + r.width / 2 - w / 2));
    return { top: r.top - gap - h + 'px', left: left + 'px', transform: 'none' };
  }
  // Right
  if (r.right + gap + w <= vw - 16) {
    let top = Math.max(16, Math.min(vh - h - 16, r.top + r.height / 2 - h / 2));
    return { top: top + 'px', left: r.right + gap + 'px', transform: 'none' };
  }
  // Left
  if (r.left - gap - w >= 16) {
    let top = Math.max(16, Math.min(vh - h - 16, r.top + r.height / 2 - h / 2));
    return { top: top + 'px', left: r.left - gap - w + 'px', transform: 'none' };
  }
  return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
});

// Target element
function getTarget() {
  const sel = stepDef.value.selector;
  if (!sel) return null;
  return document.querySelector(sel);
}

function updatePosition() {
  const s = store.onboardingStep;
  if (s === 0 || s >= totalSteps - 1) return;
  const el = getTarget();
  if (!el) { targetRect.value = null; return; }
  targetRect.value = el.getBoundingClientRect();
}

function scrollToTarget() {
  const el = getTarget();
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function refreshPosition() {
  const s = store.onboardingStep;
  if (s === 0 || s >= totalSteps - 1) return;
  tooltipReady.value = false;
  updatePosition();
  scrollToTarget();
  await new Promise(r => setTimeout(r, 400));
  updatePosition();
  await nextTick();
  const tipEl = document.querySelector('.tour-float-card');
  if (tipEl) {
    tooltipW.value = tipEl.offsetWidth || 360;
    tooltipH.value = tipEl.offsetHeight || 320;
  }
  tooltipReady.value = true;
}

function finish() {
  store.dismissOnboarding();
}

function skipStep() {
  store.nextOnboardingStep();
}

// ===== Action auto-advance watchers =====
// We watch specific store properties to detect user actions

watch(() => store.selectedCategoryId, (val) => {
  if (store.onboardingStep === 1 && val != null) {
    // Small delay so the UI updates before advancing
    setTimeout(() => { if (store.onboardingStep === 1) store.nextOnboardingStep(); }, 300);
  }
});

watch(() => store.editingNote, (val) => {
  if (store.onboardingStep === 2 && val != null) {
    setTimeout(() => { if (store.onboardingStep === 2) store.nextOnboardingStep(); }, 300);
  }
});

watch(() => store.editContent, (val) => {
  if (store.onboardingStep === 3 && val && val.trim().length > 0) {
    setTimeout(() => { if (store.onboardingStep === 3) store.nextOnboardingStep(); }, 300);
  }
});

// Step 4: detect any of: theme toggle, shortcut panel, user guide
watch([() => store.theme, () => store.shortcutPanelVisible, () => store.userGuideVisible], ([t, sp, ug]) => {
  if (store.onboardingStep === 4) {
    // Compare against initial values at step start
    if (t !== step4Init.theme || sp !== step4Init.shortcuts || ug !== step4Init.guide) {
      setTimeout(() => { if (store.onboardingStep === 4) store.nextOnboardingStep(); }, 300);
    }
  }
});

let step4Init = { theme: store.theme, shortcuts: false, guide: false };

// Watcher: reposition and reset step4 init on step change
watch(() => store.onboardingStep, (step) => {
  if (step === 4) {
    step4Init = { theme: store.theme, shortcuts: store.shortcutPanelVisible, guide: store.userGuideVisible };
  }
  if (step === 0 || step >= totalSteps - 1) {
    targetRect.value = null;
    tooltipReady.value = true;
  } else {
    refreshPosition();
  }
});

watch(() => store.onboardingVisible, (vis) => {
  if (vis) {
    if (store.onboardingStep === 0 || store.onboardingStep >= totalSteps - 1) {
      tooltipReady.value = true;
    } else {
      refreshPosition();
    }
  }
});

// Resize/scroll
let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const s = store.onboardingStep;
    if (store.onboardingVisible && s > 0 && s < totalSteps - 1) {
      updatePosition();
    }
  }, 100);
}

onMounted(() => {
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize);
  clearTimeout(resizeTimer);
});
</script>

<style scoped>
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 60;
}

/* Overlay */
.tour-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 61;
}
.tour-mask-transparent {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 61;
  pointer-events: none;
}

/* Spotlight */
.tour-spotlight {
  position: fixed;
  z-index: 62;
  pointer-events: none;
  box-shadow:
    0 0 0 3px var(--color-accent),
    0 0 0 9999px rgba(0, 0, 0, 0.5);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tour-spotlight::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 12px;
  border: 2px solid rgba(255,255,255,0.12);
  pointer-events: none;
}
.tour-spotlight-pulse {
  animation: tour-pulse 2s ease-in-out infinite;
}
@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 3px var(--color-accent), 0 0 0 9999px rgba(0,0,0,0.5); }
  50% { box-shadow: 0 0 0 5px var(--color-accent), 0 0 0 9999px rgba(0,0,0,0.55); }
}

/* Centered card */
.tour-card-centered {
  position: fixed;
  inset: 0;
  z-index: 62;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  pointer-events: none;
}
.tour-card-inner {
  pointer-events: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  overflow: hidden;
  animation: tour-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Float card */
.tour-float-card {
  position: fixed;
  z-index: 63;
  pointer-events: auto;
  width: 360px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  padding: 22px 24px 18px;
}

/* Accent bar */
.tour-accent-bar {
  height: 5px;
  width: 100%;
  background: linear-gradient(90deg, var(--color-accent), #f59e0b, var(--color-accent));
}

/* Body */
.tour-body {
  padding: 24px 28px 20px;
}

/* Step badge */
.tour-step-badge-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.tour-step-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.tour-dots {
  display: flex;
  align-items: center;
  gap: 5px;
}
.tour-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-default);
  transition: all 0.3s ease;
}
.tour-dot-active {
  width: 20px;
  border-radius: 3px;
  background: var(--color-accent);
}
.tour-dot-done {
  background: var(--text-tertiary);
}

/* Icon */
.tour-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  margin: 0 auto 16px;
  background: var(--color-accent-subtle);
}
.tour-float-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  margin-bottom: 10px;
  background: var(--color-accent-subtle);
}
.tour-icon {
  width: 26px;
  height: 26px;
  color: var(--color-accent);
}
.tour-float-icon-box .tour-icon {
  width: 22px;
  height: 22px;
}

/* Title & desc */
.tour-title {
  font-size: 1.15rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.tour-float-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--text-primary);
}
.tour-desc {
  font-size: 0.85rem;
  line-height: 1.65;
  color: var(--text-secondary);
}

/* Action hint */
.tour-action-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  animation: tour-hint-pulse 2s ease-in-out infinite;
}
.tour-action-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  animation: tour-point 1.5s ease-in-out infinite;
}
@keyframes tour-point {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
}
@keyframes tour-hint-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Tip */
.tour-tip {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.78rem;
  line-height: 1.7;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  color: var(--text-tertiary);
}

/* Footer */
.tour-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tour-float-card .tour-footer {
  padding: 0;
}
.tour-btn-skip {
  font-size: 0.78rem;
  padding: 6px 12px;
  border-radius: 8px;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.tour-btn-skip:hover { opacity: 0.7; }
.tour-btn-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tour-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background: var(--color-accent);
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.tour-btn-primary:hover { opacity: 0.85; }
.tour-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: opacity 0.15s;
}
.tour-btn-secondary:hover { opacity: 0.75; }
.tour-btn-arrow {
  width: 14px;
  height: 14px;
}

/* Animations */
@keyframes tour-pop-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.tour-float-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.tour-float-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.tour-float-enter-from { opacity: 0; transform: translateY(8px); }
.tour-float-leave-to { opacity: 0; transform: translateY(-4px); }

/* kbd/code */
:deep(kbd) {
  display: inline-block;
  padding: 1px 6px;
  font-size: 0.7rem;
  font-family: ui-monospace, monospace;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  color: var(--text-secondary);
}
:deep(code) {
  padding: 1px 5px;
  font-size: 0.85em;
  font-family: ui-monospace, monospace;
  background: var(--bg-input);
  border-radius: 3px;
  color: var(--color-accent);
}
</style>
