<template>
  <div class="fixed inset-0 z-[100]" style="background: #ffffff;">
    <div class="absolute inset-0 flex items-center justify-center p-4">
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
      </div>
    </div>

    <!-- 底部联系信息 -->
    <div class="absolute bottom-0 left-0 right-0 text-center py-3">
      <span class="text-xs" style="color: #999;">联系作者: 邮箱 3351247805@qq.com · GitHub ayf-master</span>
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
