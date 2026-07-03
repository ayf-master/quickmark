<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4"
    style="background: var(--bg-overlay);">
    <div class="w-full max-w-sm rounded-2xl shadow-xl p-8"
      style="background: var(--bg-elevated); border: 1px solid var(--border-default);">
      <!-- Logo + 标题 -->
      <div class="text-center mb-6">
        <div class="text-4xl mb-2" style="color: var(--color-accent);">⚡</div>
        <h1 class="text-xl font-bold" style="color: var(--text-primary);">QuickMark</h1>
        <p class="text-xs mt-1" style="color: var(--text-tertiary);">轻量级笔记应用</p>
      </div>

      <!-- Tab 切换: 登录 / 注册 (仅当后端开启注册时显示) -->
      <div v-if="allowRegister" class="flex gap-1 mb-5 p-1 rounded-lg"
        style="background: var(--bg-panel);">
        <button type="button" @click="mode = 'login'"
          class="flex-1 py-1.5 text-sm rounded-md transition-colors"
          :style="mode === 'login'
            ? 'background: var(--bg-elevated); color: var(--text-primary); font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.06);'
            : 'color: var(--text-tertiary);'">
          登录
        </button>
        <button type="button" @click="mode = 'register'"
          class="flex-1 py-1.5 text-sm rounded-md transition-colors"
          :style="mode === 'register'
            ? 'background: var(--bg-elevated); color: var(--text-primary); font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.06);'
            : 'color: var(--text-tertiary);'">
          注册
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" role="alert"
        class="mb-4 px-3 py-2 rounded-lg text-sm"
        style="background: var(--color-danger-bg, #fef2f2); color: var(--color-danger, #dc2626); border: 1px solid currentColor;">
        {{ errorMsg }}
      </div>

      <!-- 表单 -->
      <form @submit.prevent="onSubmit" class="space-y-4">
        <div>
          <label class="block text-sm mb-1.5" style="color: var(--text-secondary);"
            for="login-username">用户名</label>
          <input id="login-username" type="text" v-model="username"
            autocomplete="username"
            ref="usernameInput"
            :disabled="loading"
            class="input"
            placeholder="请输入用户名"
            required minlength="3" maxlength="32"
            @keydown.enter.prevent="passwordInput?.focus()" />
        </div>

        <!-- 注册模式: 显示名称 (可选) -->
        <div v-if="mode === 'register'">
          <label class="block text-sm mb-1.5" style="color: var(--text-secondary);"
            for="login-displayname">显示名称 <span style="color: var(--text-tertiary);">(可选)</span></label>
          <input id="login-displayname" type="text" v-model="displayName"
            :disabled="loading"
            class="input"
            placeholder="留空则使用用户名"
            maxlength="32" />
        </div>

        <div>
          <label class="block text-sm mb-1.5" style="color: var(--text-secondary);"
            for="login-password">{{ mode === 'register' ? '密码 (至少 6 位)' : '密码' }}</label>
          <input id="login-password" type="password" v-model="password"
            ref="passwordInput"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            :disabled="loading"
            class="input"
            placeholder="请输入密码"
            required :minlength="mode === 'register' ? 6 : 1"
            @keydown.enter="onSubmit" />
        </div>

        <!-- 注册模式: 确认密码 -->
        <div v-if="mode === 'register'">
          <label class="block text-sm mb-1.5" style="color: var(--text-secondary);"
            for="login-password2">确认密码</label>
          <input id="login-password2" type="password" v-model="password2"
            autocomplete="new-password"
            :disabled="loading"
            class="input"
            placeholder="再输一次密码"
            required minlength="6" />
        </div>

        <button type="submit"
          class="btn btn-primary w-full"
          :disabled="loading || !username || !password || (mode === 'register' && !password2)">
          <span v-if="loading">{{ mode === 'register' ? '注册中...' : '登录中...' }}</span>
          <span v-else>{{ mode === 'register' ? '注册并登录' : '登录' }}</span>
        </button>
      </form>

      <p v-if="mode === 'register'" class="text-center text-xs mt-6"
        style="color: var(--text-tertiary);">
        注册后立即登录,无需再次输入密码
      </p>


      <!-- 联系信息 -->
      <div class="mt-6 pt-5 text-center border-t" style="border-color: var(--border-default);">
        <p class="text-xs mb-2" style="color: var(--text-tertiary);">联系作者</p>
        <div class="flex items-center justify-center gap-4 text-xs">
          <a href="mailto:3351247805@qq.com"
            class="inline-flex items-center gap-1 transition-colors hover:opacity-70"
            style="color: var(--color-accent);">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            3351247805@qq.com
          </a>
          <a href="https://github.com/ayf-master"
            target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-1 transition-colors hover:opacity-70"
            style="color: var(--color-accent);">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            ayf-master
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import API from '@/api/index.js';

const props = defineProps({
  initialError: { type: String, default: '' }
});

const emit = defineEmits(['success']);

// 注册开关: 静态硬编码, 跟 .env ALLOW_REGISTER 保持一致
// (生产环境应改为后端返回的配置接口, 阶段 8 简化为本地判断)
const allowRegister = ref(true);

const mode = ref('login'); // 'login' | 'register'
const username = ref('');
const displayName = ref('');
const password = ref('');
const password2 = ref('');
const loading = ref(false);
const errorMsg = ref(props.initialError);
const usernameInput = ref(null);
const passwordInput = ref(null);

onMounted(() => {
  usernameInput.value?.focus();
});

// 切换 mode 时清空错误 + 密码
watch(mode, () => {
  errorMsg.value = '';
  password.value = '';
  password2.value = '';
});

async function onSubmit() {
  if (loading.value) return;
  errorMsg.value = '';

  // 注册前置校验
  if (mode.value === 'register') {
    if (password.value.length < 6) {
      errorMsg.value = '密码至少 6 位';
      return;
    }
    if (password.value !== password2.value) {
      errorMsg.value = '两次密码输入不一致';
      return;
    }
  }

  loading.value = true;
  try {
    if (mode.value === 'register') {
      await API.register({
        username: username.value.trim(),
        password: password.value,
        displayName: displayName.value.trim() || undefined
      });
    } else {
      await API.login(username.value.trim(), password.value);
    }
    emit('success');
  } catch (err) {
    errorMsg.value = err.message || (mode.value === 'register' ? '注册失败' : '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>
