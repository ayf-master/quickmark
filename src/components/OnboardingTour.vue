<template>
  <Teleport to="body">
    <div v-if="store.onboardingVisible" class="tour-root">

      <!-- Step 0: Welcome page (full mask + centered card, click outside to dismiss) -->
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

      <!-- Steps 1-5: Spotlight + floating tooltip -->
      <template v-else>
        <div class="tour-mask-transparent"></div>

        <!-- Spotlight cutout (highlight ring + dark overlay) -->
        <div v-if="targetRect" class="tour-spotlight" :style="spotlightStyle"></div>

        <!-- Floating tooltip card -->
        <Transition name="tour-float">
          <div v-if="tooltipReady" class="tour-float-card" :style="tooltipStyle" :key="'tc-'+store.onboardingStep">
            <!-- Step indicator -->
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
            <div v-if="stepDef.tip" class="tour-tip" v-html="stepDef.tip"></div>

            <div class="tour-footer" style="margin-top: 16px;">
              <button class="tour-btn-skip" @click="store.dismissOnboarding()">跳过</button>
              <div class="tour-btn-group">
                <button v-if="store.onboardingStep > 1" class="tour-btn-secondary" @click="store.prevOnboardingStep()">
                  <svg class="tour-btn-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
                  </svg>
                  上一步
                </button>
                <button v-if="store.onboardingStep < totalSteps - 1" class="tour-btn-primary" @click="goNext">
                  下一步
                  <svg class="tour-btn-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <button v-else class="tour-btn-primary" @click="store.nextOnboardingStep()">
                  <svg class="tour-btn-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  开始使用
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </template>

    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { store } from '@/store';
import { ONBOARDING_TOTAL_STEPS } from '@/store';

const totalSteps = ONBOARDING_TOTAL_STEPS;

// Step definitions
const steps = [
  {
    // Step 0: Welcome (centered card, no spotlight)
    selector: null,
    icon: 'M12 4v16m8-8H4',
    title: '欢迎使用 QuickMark',
    desc: '轻量级笔记应用，支持 <b>Markdown</b>、<b>树形分类</b>、<b>知识图谱</b>。<br>跟着这几步快速上手。',
    tip: '按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>/</kbd> 随时查看完整使用指南。'
  },
  {
    // Step 1: Sidebar - category management
    selector: '[data-tour="sidebar"]',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    title: '用分类管理笔记',
    desc: '左侧是 <b>分类树</b>，按主题组织笔记，支持无限层级嵌套和 8 种颜色标识。',
    tip: '点击分类名筛选笔记 · 悬停后点 "+" 创建子分类<br>点底部 <b>知识图谱</b> 查看笔记关联关系'
  },
  {
    // Step 2: Note list
    selector: '[data-tour="note-list"]',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    title: '浏览笔记列表',
    desc: '选中分类后，中间列展示该分类下的所有笔记。<br>支持 <b>拖拽排序</b> 和<b>收藏过滤</b>。',
    tip: '点击笔记卡片打开编辑 · 点击大头针只看收藏的笔记'
  },
  {
    // Step 3: Editor
    selector: '[data-tour="editor"]',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    title: '写笔记',
    desc: '右侧编辑器支持 <b>纯文本</b> 和 <b>Markdown</b> 两种模式。<br>输入自动保存，不用担心丢内容。',
    tip: '切换编辑模式 · Markdown 工具栏可加粗、斜体、插入代码块<br>支持 <code>[[Wiki 链接]]</code> 关联其他笔记 · 拖拽/粘贴上传图片'
  },
  {
    // Step 4: Search
    selector: '[data-note-search-input]',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    title: '全局搜索',
    desc: '跨笔记搜索标题和正文内容，快速定位。',
    tip: '<kbd>Ctrl</kbd>+<kbd>K</kbd> 快速搜索 · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> 搜索分类名<br>左侧分类筛选可以只搜当前分类'
  },
  {
    // Step 5: User menu / shortcuts
    selector: '[data-tour="user-menu"]',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    title: '快捷键与更多功能',
    desc: '点用户头像可 <b>切换主题</b>、打开<b>使用指南</b>、查看<b>快捷键面板</b>。',
    tip: '<kbd>Alt</kbd>+<kbd>N</kbd> 新建笔记 · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> 收藏切换<br><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>M</kbd> 切换编辑模式 · <kbd>?</kbd> 打开快捷键面板'
  }
];

const stepDef = computed(() => steps[store.onboardingStep] || steps[0]);

// Spotlight positioning
const targetRect = ref(null);
const tooltipReady = ref(false);
const tooltipW = ref(360);
const tooltipH = ref(340);

const spotlightStyle = computed(() => {
  if (!targetRect.value) return { display: 'none' };
  const r = targetRect.value;
  return {
    top: r.top + 'px',
    left: r.left + 'px',
    width: r.width + 'px',
    height: r.height + 'px',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px'
  };
});

const tooltipStyle = computed(() => {
  if (!targetRect.value && store.onboardingStep > 0) {
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
  // Center fallback
  return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
});

// Target element tracking
function getTarget() {
  const sel = stepDef.value.selector;
  if (!sel) return null;
  return document.querySelector(sel);
}

function updatePosition() {
  if (store.onboardingStep === 0) return;
  const el = getTarget();
  if (!el) {
    targetRect.value = null;
    return;
  }
  const rect = el.getBoundingClientRect();
  const prev = targetRect.value;
  if (!prev || prev.top !== rect.top || prev.left !== rect.left || prev.width !== rect.width || prev.height !== rect.height) {
    targetRect.value = rect;
  }
}

function scrollToTarget() {
  const el = getTarget();
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function refreshPosition() {
  if (store.onboardingStep === 0) return;
  tooltipReady.value = false;
  // Immediately position spotlight at current location (may be off-screen or at old scroll pos)
  updatePosition();
  scrollToTarget();
  // Wait for scroll to complete, then re-position
  await new Promise(r => setTimeout(r, 400));
  updatePosition();
  await nextTick();
  const tipEl = document.querySelector('.tour-float-card');
  if (tipEl) {
    tooltipW.value = tipEl.offsetWidth || 360;
    tooltipH.value = tipEl.offsetHeight || 340;
  }
  tooltipReady.value = true;
}

function goNext() {
  store.nextOnboardingStep();
}

// Watchers
watch(() => store.onboardingStep, () => {
  if (store.onboardingStep === 0) {
    targetRect.value = null;
    tooltipReady.value = true;
  } else {
    refreshPosition();
  }
});

watch(() => store.onboardingVisible, (vis) => {
  if (vis) {
    if (store.onboardingStep === 0) {
      tooltipReady.value = true;
    } else {
      refreshPosition();
    }
  }
});

// Resize handler
let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (store.onboardingVisible && store.onboardingStep > 0) {
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

/* Overlay masks */
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

/* Spotlight cutout */
.tour-spotlight {
  position: fixed;
  z-index: 62;
  pointer-events: none;
  border-radius: 8px;
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

/* Centered card (step 0) */
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

/* Float card (steps 1-5) */
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
  transition: opacity 0.25s ease, transform 0.25s ease;
}

/* Shared components */
.tour-accent-bar {
  height: 5px;
  width: 100%;
  background: linear-gradient(90deg, var(--color-accent), #f59e0b, var(--color-accent));
}

.tour-body {
  padding: 24px 28px 20px;
}

.tour-step-badge-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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
  margin-bottom: 12px;
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

.tour-tip {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.78rem;
  line-height: 1.7;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  color: var(--text-tertiary);
}

/* Footer / Navigation */
.tour-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px 18px;
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
.tour-btn-skip:hover {
  opacity: 0.7;
}

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
.tour-btn-primary:hover {
  opacity: 0.85;
}

.tour-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: opacity 0.15s;
}
.tour-btn-secondary:hover {
  opacity: 0.75;
}

.tour-btn-arrow {
  width: 14px;
  height: 14px;
}

/* Animations */
@keyframes tour-pop-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.tour-float-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.tour-float-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tour-float-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.tour-float-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* kbd/code styling in tour content */
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