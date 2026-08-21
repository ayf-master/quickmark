<template>
  <Teleport to="body">
    <div v-if="store.onboardingVisible" class="tour-root">

      <!-- Step 0: Welcome page (centered card) -->
      <template v-if="store.onboardingStep === 0">
        <div class="tour-mask" @click="store.dismissOnboarding()"></div>
        <div class="tour-card-centered">
          <div class="tour-card-inner" style="width: min(400px, 100%);" @click.stop>
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

      <!-- Step 1-4: Spotlight + 悬浮卡片 (无全屏遮罩, 原 UI 100% 可交互) -->
      <template v-else-if="store.onboardingStep < totalSteps - 1">
        <!-- Spotlight (高亮边框 + 脉动) -->
        <div v-if="targetRect && !modalOpen" class="tour-spotlight" :class="{ 'tour-spotlight-pulse': isWaitingForAction }" :style="spotlightStyle"></div>

        <!-- Bubble -->
        <Transition name="tour-float">
          <div v-if="tooltipReady" class="tour-float-card" :class="['tour-float-' + tooltipSide]" :style="tooltipStyle" :key="'tc-'+store.onboardingStep">
            <div class="tour-step-badge-wrap">
              <span class="tour-step-badge">{{ store.onboardingStep + 1 }} / {{ totalSteps }}</span>
              <div class="tour-dots">
                <button v-for="i in totalSteps" :key="i" type="button" class="tour-dot"
                  :class="{
                    'tour-dot-active': i - 1 === store.onboardingStep,
                    'tour-dot-done': i - 1 < store.onboardingStep
                  }"
                  :aria-label="'跳转到第 ' + i + ' 步'"
                  :title="'跳转到第 ' + i + ' 步'"
                  @click="goToStep(i - 1)"></button>
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
                <button class="tour-btn-primary" @click="skipStep">
                  下一步
                  <svg class="tour-btn-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                  </svg>
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
          <div class="tour-card-inner" style="width: min(400px, 100%);" @click.stop>
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
  const m = store.isMobile;
  if (step === 1) return m ? '打开左上角菜单, 点击一个分类' : '在左侧点击一个分类';
  if (step === 2) return m ? '在列表中点击一篇笔记' : '在中间点击一篇笔记';
  if (step === 3) return m ? '点击输入框开始输入' : '在右侧编辑器中输入内容';
  if (step === 4) return store.isDesktop ? '点击用户头像, 尝试切换主题或查看快捷键' : '先返回列表, 再点击右上角头像切换主题';
  return '完成此操作';
});

// Step definitions (手机/平板触摸设备无键盘: 文案适配 + 去掉快捷键提示)
const steps = computed(() => {
  const m = store.isMobile;
  const hasKeyboard = store.isDesktop;
  return [
  {
    selector: null,
    icon: 'M12 4v16m8-8H4',
    title: '欢迎使用 QuickMark',
    desc: '轻量级笔记应用，支持 <b>Markdown</b>、<b>树形分类</b>、<b>知识图谱</b>。<br>跟着引导实际操作一遍，快速上手。',
    tip: hasKeyboard ? '按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>/</kbd> 随时查看完整使用指南。' : undefined
  },
  {
    selector: '[data-tour="sidebar"]',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    title: '浏览分类',
    desc: m
      ? '打开左上角 <b>菜单</b>, 点击 <b>任意一个分类</b> 查看笔记。'
      : '点击左侧 <b>任意一个分类</b>, 查看该分类下的笔记。',
    action: 'category',
    tip: m
      ? '分类支持多级嵌套, 长按分类行可拖拽排序。'
      : '分类支持多级嵌套, 悬停后点 "+" 可创建子分类。'
  },
  {
    selector: '[data-tour="note-list"]',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    title: '打开笔记',
    desc: m
      ? '在列表中 <b>点击一篇笔记</b> 打开它。'
      : '在笔记列表中 <b>点击一篇笔记</b>, 右侧编辑器会打开它。',
    action: 'note',
    tip: m
      ? '长按笔记可拖拽排序, 卡片右上角删除图标可删除。'
      : '笔记支持拖拽排序, 点击大头针图标可收藏。'
  },
  {
    // 手机/平板: 编辑器全屏, 高亮整个编辑器 = 整个屏幕黄框; 改高亮正文输入区
    selector: store.isCompact ? '[data-tour="editor-body"]' : '[data-tour="editor"]',
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
    desc: hasKeyboard
      ? '点击右上角 <b>用户头像</b>, 试试切换主题或查看快捷键。'
      : store.isCompact
        ? '先点左上角 <b>返回</b> 回到列表, 再点右上角 <b>头像</b> 试试切换主题。'
        : '点击右上角 <b>用户头像</b>, 试试切换主题。',
    action: 'theme',
    tip: hasKeyboard
      ? '<kbd>Alt</kbd>+<kbd>N</kbd> 新建笔记 · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> 收藏切换'
      : '打开菜单即可新建笔记或退出登录。'
  },
  {
    // Step 5: Done (no action)
    selector: null,
    icon: 'M5 13l4 4L19 7',
    title: '已完成新手引导',
    desc: '你已经掌握了 QuickMark 的基本操作。<br>需要帮助时，随时查看使用指南。',
    tip: hasKeyboard ? '按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>/</kbd> 打开完整使用指南' : undefined
  }
  ];
});

const stepDef = computed(() => steps.value[store.onboardingStep] || steps.value[0]);
const isWaitingForAction = computed(() => {
  const s = store.onboardingStep;
  return s >= 1 && s <= 4;
});

// Spotlight positioning
const targetRect = ref(null);
const tooltipReady = ref(false);
const tooltipW = ref(360);
const tooltipH = ref(320);
const tooltipSide = ref('below'); // 'below' | 'above' | 'right' | 'left' | 'center' | 'corner'

// ===== Modal-aware positioning =====
// 应用中所有模态框 (CategoryDialog / NewNoteDialog / PreferenceDialog /
// ShortcutHelp / UserGuide) 都遵循 W3C ARIA 标准:
//   <div role="dialog" aria-modal="true">
// 检测到任一打开时, 引导卡临时靠到右下角 + 抬升 z-index 到 60,
// 既保留引导提示可见, 又不遮挡模态框内容.
const modalOpen = ref(false);

function isModalOpen() {
  const modals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  for (const m of modals) {
    // 过滤掉 onboarding tour 自己 (tour-root 没有 aria-modal, 不会匹配;
    // 但保留这层保险, 万一未来加了也不会被自己误判)
    if (m.closest('.tour-root')) continue;
    if (m.getBoundingClientRect().width > 0) return true;
  }
  return false;
}

// 用 MutationObserver 监听模态框 mount/unmount, 比 setInterval 轻
let modalObserver = null;
function refreshModalState() {
  modalOpen.value = isModalOpen();
}

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
  // 模态框打开时: 优先把引导卡靠到右下角, 不遮挡模态框内容
  if (modalOpen.value) {
    tooltipSide.value = 'corner';
    return {
      top: 'auto',
      left: 'auto',
      bottom: '24px',
      right: '24px',
      transform: 'none'
    };
  }
  // 所有"引导操作"步骤(1~4): 统一放屏幕底部居中、箭头朝上。
  // 无论高亮的是侧边栏/笔记列表/编辑器/头像, 卡片都不会遮挡任何可交互区域,
  // 从根本上杜绝"挡住输入框/头像"的问题 (之前按单步写死编号容易漏判)。
  if (store.onboardingStep >= 1 && store.onboardingStep <= 4) {
    tooltipSide.value = 'bottom-center';
    return { top: 'auto', left: '50%', bottom: '24px', transform: 'translateX(-50%)' };
  }
  // 欢迎页(step 0)与完成页(step 5): 无需要交互的目标, 屏幕正中即可
  tooltipSide.value = 'center';
  return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  const r = targetRect.value;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 14;
  const w = tooltipW.value;
  const h = tooltipH.value;

  // Try below first
  if (r.bottom + gap + h <= vh - 20) {
    tooltipSide.value = 'below';
    let left = Math.max(16, Math.min(vw - w - 16, r.left + r.width / 2 - w / 2));
    return { top: r.bottom + gap + 'px', left: left + 'px', transform: 'none' };
  }
  // Try above
  if (r.top - gap - h >= 20) {
    tooltipSide.value = 'above';
    let left = Math.max(16, Math.min(vw - w - 16, r.left + r.width / 2 - w / 2));
    return { top: r.top - gap - h + 'px', left: left + 'px', transform: 'none' };
  }
  // Right
  if (r.right + gap + w <= vw - 16) {
    tooltipSide.value = 'right';
    let top = Math.max(16, Math.min(vh - h - 16, r.top + r.height / 2 - h / 2));
    return { top: top + 'px', left: r.right + gap + 'px', transform: 'none' };
  }
  // Left
  if (r.left - gap - w >= 16) {
    tooltipSide.value = 'left';
    let top = Math.max(16, Math.min(vh - h - 16, r.top + r.height / 2 - h / 2));
    return { top: top + 'px', left: r.left - gap - w + 'px', transform: 'none' };
  }
  tooltipSide.value = 'center';
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
  // 手机/平板上编辑器全屏 (fixed 盖住顶部栏含头像): 高亮被遮挡的目标无意义
  if (store.isCompact && store.editingNote && s === 4) {
    targetRect.value = null;
    return;
  }
  const el = getTarget();
  if (!el) { targetRect.value = null; return; }
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // 目标在屏幕外 (如手机抽屉未打开时的侧栏): 不显示高亮框, 避免画到错误位置
  if (r.width <= 0 || r.height <= 0 || r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) {
    targetRect.value = null;
    return;
  }
  targetRect.value = r;
}

// 手机抽屉开/关时刷新高亮位置 (侧栏从屏幕外滑入后需重新计算)
watch(() => store.mobileDrawerOpen, () => {
  if (store.onboardingVisible) {
    nextTick(() => setTimeout(updatePosition, 300));
  }
});

// 编辑器打开/关闭时刷新 (手机上 Step 4 需先返回列表, 头像才可见)
watch(() => store.editingNote, () => {
  if (store.onboardingVisible) {
    nextTick(() => setTimeout(updatePosition, 300));
  }
});

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

// 引导卡顶部 dots 可点击, 跳到任意步骤 (用户要求的优化点)
// 比如 step 4 想回头看 step 2 的内容, 直接点对应 dot
function goToStep(i) {
  store.goToOnboardingStep(i);
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
  // 监听模态框 mount/unmount, 触发引导卡重定位
  modalObserver = new MutationObserver(() => {
    refreshModalState();
  });
  modalObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-modal']
  });
  refreshModalState();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize);
  clearTimeout(resizeTimer);
  modalObserver?.disconnect();
  modalObserver = null;
});
</script>

<style scoped>
/* tour-root 是 fixed 全屏容器, z-index 60.
   必须 pointer-events: none, 否则它会拦截下层所有 UI 的鼠标事件
   (子元素 pointer-events: none 救不回 - 事件停在父元素就下不去了).
   真正需要接收事件的子元素 (.tour-float-card / .tour-card-centered / .tour-mask)
   各自单独设 pointer-events: auto. */
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
}

/* Overlay */
.tour-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 61;
  pointer-events: auto;
  cursor: pointer;
}
/* Step 1-4 设计: 不用全屏深色遮罩
   原因: 用户希望"原 UI 完全可交互, 只让卡片悬浮 + spotlight 框"
   spotlight 元素 z-index 50, 远高于原 UI (普遍 30+),
   spotlight 自身 transparent + pointer-events: none, 不拦截事件,
   只通过 3px 橙色边框视觉标记目标位置 */

/* Spotlight: 只画橙色边框 (无 box-shadow 阴影, 避免 Chromium hit test 边缘)
   pointer-events: none 不会拦截下层按钮
   z-index 45 < 应用模态框 z-index 55, 模态框打开时自然覆盖引导元素 (避免遮挡) */
.tour-spotlight {
  position: fixed;
  z-index: 45;
  pointer-events: none;
  box-shadow: 0 0 0 3px var(--color-accent);
  border-radius: 8px;
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
/* 脉动只动边框粗细 (3px <-> 5px), 不画 9999px 阴影 */
@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 3px var(--color-accent); }
  50%      { box-shadow: 0 0 0 5px var(--color-accent); }
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
  z-index: 45;
  pointer-events: auto;
  width: min(360px, calc(100vw - 32px));
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  padding: 22px 24px 18px;
}
/* 手机: 卡片过大占满屏幕, 压缩内边距/字号/图标, 超高可滚动 */
@media (max-width: 720px) {
  .tour-float-card {
    width: calc(100vw - 24px);
    padding: 16px 16px 14px;
    max-height: calc(100vh - 56px);
    overflow-y: auto;
  }
  .tour-float-card.tour-float-corner {
    width: calc(100vw - 24px);
  }
  .tour-body {
    padding: 18px 18px 14px;
  }
  .tour-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    margin-bottom: 12px;
  }
  .tour-float-icon-box {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    margin-bottom: 8px;
  }
  .tour-icon {
    width: 22px;
    height: 22px;
  }
  .tour-float-icon-box .tour-icon {
    width: 18px;
    height: 18px;
  }
  .tour-title {
    font-size: 1rem;
    margin-bottom: 6px;
  }
  .tour-float-title {
    font-size: 0.95rem;
  }
  .tour-desc {
    font-size: 0.8rem;
    line-height: 1.55;
  }
  .tour-tip {
    margin-top: 8px;
    padding: 8px 10px;
    font-size: 0.74rem;
    line-height: 1.6;
  }
  .tour-action-hint {
    margin-top: 8px;
    padding: 7px 10px;
    font-size: 0.78rem;
  }
  .tour-btn-primary {
    padding: 7px 14px;
    font-size: 0.82rem;
  }
  .tour-step-badge-wrap {
    margin-bottom: 10px;
  }
}
/* 模态框打开时: 引导卡临时靠到右下角, 抬升 z-index 到 60
   (高于模态框 z-index 55, 但又不挡住模态框主体内容)
   用户既能看到引导提示, 又不会被模态框遮挡 */
.tour-float-corner {
  z-index: 60;
  width: 280px;
  padding: 16px 18px 14px;
}
/* 箭头: 用 ::before + ::after 堆叠画三角形 (双层避开边框锯齿) */
.tour-float-card::before,
.tour-float-card::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  background: var(--bg-elevated);
  pointer-events: none;
  z-index: 0;
}
/* 外层箭头 (边框色) */
.tour-float-card::before {
  background: var(--border-default);
}
/* 内层箭头 (卡片色, 盖住外层中间 = 看到 1px 边框) */
/* 注意: 顺序是 ::before 后 ::after, 同位置时 ::after 在上 */
.tour-float-above::before,
.tour-float-above::after {
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 0 0 3px 0;
}
.tour-float-below::before,
.tour-float-below::after {
  top: -7px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 3px 0 0 0;
}
.tour-float-right::before,
.tour-float-right::after {
  left: -7px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  border-radius: 3px 0 0 0;
}
/* bottom-center: 固定在屏幕底部居中, 箭头朝上 (用于 step 3/4 不挡核心可交互区) */
.tour-float-bottom-center::before,
.tour-float-bottom-center::after {
  top: -7px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 3px 0 0 0;
}
.tour-float-left::before,
.tour-float-left::after {
  right: -7px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  border-radius: 0 3px 0 0;
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
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tour-dot:hover:not(.tour-dot-active) {
  background: var(--text-tertiary);
  transform: scale(1.4);
}
.tour-dot:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
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
