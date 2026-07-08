<template>
  <header class="flex items-center justify-between px-4 py-3 flex-shrink-0"
    style="background: var(--bg-panel); border-bottom: 1px solid var(--border-default);">
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <!-- 桌面端: 折叠/展开侧边栏按钮 (侧边栏折叠后显示) -->
      <button v-if="store.isDesktop && store.sidebarCollapsed"
        class="btn btn-icon btn-ghost"
        @click="store.sidebarCollapsed = false"
        aria-label="展开侧边栏"
        title="展开侧边栏">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <!-- 移动端: 汉堡按钮 -->
      <button v-if="store.isCompact"
        class="btn btn-icon btn-ghost"
        @click="store.mobileDrawerOpen = true"
        aria-label="打开菜单"
        :aria-expanded="store.mobileDrawerOpen">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <!-- Logo -->
      <h1 class="text-base font-bold flex items-center gap-1.5 flex-shrink-0"
        style="color: var(--text-primary);">
        <span style="color: var(--color-accent);">⚡</span>
        <span class="hidden sm:inline">QuickMark</span>
      </h1>

      <!-- 搜索框 (移动端居中) -->
      <div v-if="store.isCompact" class="relative flex-1 max-w-xs ml-2">
        <input type="text"
          v-model="store.searchQuery"
          @input="store.onSearchInput()"
          data-search-input
          placeholder="搜索..."
          class="input pl-9"
          style="padding-top: 6px; padding-bottom: 6px;"
          aria-label="搜索笔记" />
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style="color: var(--text-tertiary);">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
    </div>

    <div class="flex items-center gap-1 flex-shrink-0">
      <!-- 移动端: 新建笔记快捷按钮 -->
      <button v-if="store.isCompact"
        class="btn btn-icon btn-primary"
        @click="store.openNewNoteDialog()"
        style="width:32px;height:32px;"
        aria-label="新建笔记"
        title="新建笔记">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
        </svg>
      </button>

      <!-- 用户菜单 (桌面端 + 移动端) -->
      <div class="relative" ref="menuRef">
        <button
          class="btn btn-ghost flex items-center gap-2 px-2 py-1.5"
          @click="menuOpen = !menuOpen"
          aria-label="用户菜单"
          :aria-expanded="menuOpen"
          data-tour="user-menu">
          <!-- 头像圆点 (用用户名首字符) -->
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            :style="`background: var(--color-accent); color: white;`">
            {{ avatarChar }}
          </span>
          <!-- 桌面端显示用户名 -->
          <span v-if="store.isDesktop" class="text-sm" style="color: var(--text-primary);">
            {{ displayName }}
          </span>
          <!-- 下拉箭头 -->
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style="color: var(--text-tertiary);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <!-- 下拉菜单 -->
        <div v-if="menuOpen"
          class="absolute right-0 mt-1 w-56 rounded-lg shadow-lg py-1 z-50"
          style="background: var(--bg-elevated); border: 1px solid var(--border-default);">
          <!-- 用户信息 -->
          <div class="px-4 py-2 border-b" style="border-color: var(--border-default);">
            <div class="text-sm font-semibold" style="color: var(--text-primary);">
              {{ displayName }}
            </div>
            <div class="text-xs mt-0.5" style="color: var(--text-tertiary);">
              @{{ store.currentUser?.username }}
            </div>
          </div>

          <!-- 主题切换 -->
          <div class="px-2 py-1.5">
            <ThemeToggle />
          </div>

          <!-- 默认编辑器偏好 -->
          <div class="px-4 py-2 border-t" style="border-color: var(--border-default);">
            <div class="text-xs font-medium mb-2" style="color: var(--text-tertiary);">
              默认编辑器
            </div>
            <div class="flex flex-col gap-1">
              <label class="flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-1 transition-colors"
                style="color: var(--text-primary);"
                @mouseenter="(e) => e.currentTarget.style.background = 'var(--bg-panel)'"
                @mouseleave="(e) => e.currentTarget.style.background = 'transparent'">
                <input type="radio" name="defaultMode" value="auto"
                  :checked="store.defaultEditMode === 'auto'"
                  @change="store.setDefaultEditMode('auto')"
                  class="accent-current">
                自动检测
              </label>
              <label class="flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-1 transition-colors"
                style="color: var(--text-primary);"
                @mouseenter="(e) => e.currentTarget.style.background = 'var(--bg-panel)'"
                @mouseleave="(e) => e.currentTarget.style.background = 'transparent'">
                <input type="radio" name="defaultMode" value="markdown"
                  :checked="store.defaultEditMode === 'markdown'"
                  @change="store.setDefaultEditMode('markdown')"
                  class="accent-current">
                Markdown
              </label>
              <label class="flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-1 transition-colors"
                style="color: var(--text-primary);"
                @mouseenter="(e) => e.currentTarget.style.background = 'var(--bg-panel)'"
                @mouseleave="(e) => e.currentTarget.style.background = 'transparent'">
                <input type="radio" name="defaultMode" value="plain"
                  :checked="store.defaultEditMode === 'plain'"
                  @change="store.setDefaultEditMode('plain')"
                  class="accent-current">
                纯文本
              </label>
            </div>
          </div>

          <div class="border-t my-1" style="border-color: var(--border-default);"></div>

          <!-- 使用指南 -->
          <button
            class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
            style="color: var(--text-primary);"
            @click="onOpenGuide"
            @mouseenter="(e) => e.currentTarget.style.background = 'var(--bg-panel)'"
            @mouseleave="(e) => e.currentTarget.style.background = 'transparent'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <span>使用指南</span>
          </button>

          <!-- 快捷键面板 -->
          <button
            class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
            style="color: var(--text-primary);"
            @click="onOpenShortcuts"
            @mouseenter="(e) => e.currentTarget.style.background = 'var(--bg-panel)'"
            @mouseleave="(e) => e.currentTarget.style.background = 'transparent'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span>快捷键</span>
          </button>

          <!-- 意见反馈 (所有用户) -->
          <button
            class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
            style="color: var(--text-primary);"
            @click="onOpenFeedback"
            @mouseenter="(e) => e.currentTarget.style.background = 'var(--bg-panel)'"
            @mouseleave="(e) => e.currentTarget.style.background = 'transparent'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
            </svg>
            <span>意见反馈</span>
          </button>

          <!-- 反馈管理 (仅 admin) -->
          <button v-if="isAdmin"
            class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
            style="color: var(--text-primary);"
            @click="onOpenFeedbackAdmin"
            @mouseenter="(e) => e.currentTarget.style.background = 'var(--bg-panel)'"
            @mouseleave="(e) => e.currentTarget.style.background = 'transparent'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>反馈管理</span>
          </button>


          <div class="border-t my-1" style="border-color: var(--border-default);"></div>

          <!-- 登出 -->
          <button
            class="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
            style="color: var(--text-primary);"
            @click="onLogout"
            @mouseenter="(e) => e.currentTarget.style.background = 'var(--bg-panel)'"
            @mouseleave="(e) => e.currentTarget.style.background = 'transparent'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { store } from '@/store';
import ThemeToggle from '@/components/ThemeToggle.vue';

const isAdmin = computed(() => store.currentUser?.role === 'admin');

function onOpenFeedback() {
  menuOpen.value = false;
  emit('openFeedback');
}
function onOpenFeedbackAdmin() {
  menuOpen.value = false;
  emit('openFeedbackAdmin');
}

const emit = defineEmits(['logout', 'openFeedback', 'openFeedbackAdmin']);
const menuOpen = ref(false);
const menuRef = ref(null);

const displayName = computed(() => {
  const u = store.currentUser;
  if (!u) return '未登录';
  return u.displayName || u.username;
});

const avatarChar = computed(() => {
  const u = store.currentUser;
  if (!u) return '?';
  const name = u.displayName || u.username || '?';
  return name.charAt(0).toUpperCase();
});

// 点击外部关闭菜单
function onClickOutside(e) {
  if (menuOpen.value && menuRef.value && !menuRef.value.contains(e.target)) {
    menuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside);
});

function onLogout() {
  menuOpen.value = false;
  emit('logout');
}

function onOpenGuide() {
  menuOpen.value = false;
  store.openUserGuide();
}

function onOpenShortcuts() {
  menuOpen.value = false;
  store.shortcutPanelVisible = true;
}
</script>
