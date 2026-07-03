<template>
  <div class="login-root">
    <!-- 装饰光晕 -->
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>

    <div class="login-card">
      <!-- Logo -->
      <div class="logo-area">
        <div class="logo-icon">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 4L10 22h10l-2 16L30 18H20l2-14Z" fill="currentColor"/>
          </svg>
        </div>
        <h1>QuickMark</h1>
        <p>轻量级笔记应用</p>
      </div>

      <!-- Tab 切换 -->
      <div v-if="allowRegister" class="tab-bar">
        <button type="button" @click="mode = 'login'"
          class="tab-btn"
          :class="{ active: mode === 'login' }">
          登录
        </button>
        <button type="button" @click="mode = 'register'"
          class="tab-btn"
          :class="{ active: mode === 'register' }">
          注册
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" role="alert" class="error-msg">
        {{ errorMsg }}
      </div>

      <!-- 表单 -->
      <form @submit.prevent="onSubmit">
        <div class="field">
          <label for="login-username">用户名</label>
          <input id="login-username" type="text" v-model="username"
            autocomplete="username"
            ref="usernameInput"
            :disabled="loading"
            class="input-field"
            placeholder="请输入用户名"
            required minlength="3" maxlength="32"
            @keydown.enter.prevent="passwordInput?.focus()" />
        </div>

        <div v-if="mode === 'register'" class="field">
          <label for="login-displayname">显示名称 <span class="optional">(可选)</span></label>
          <input id="login-displayname" type="text" v-model="displayName"
            :disabled="loading"
            class="input-field"
            placeholder="留空则使用用户名"
            maxlength="32" />
        </div>

        <div class="field">
          <label for="login-password">{{ mode === 'register' ? '密码' : '密码' }}</label>
          <input id="login-password" type="password" v-model="password"
            ref="passwordInput"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            :disabled="loading"
            class="input-field"
            :placeholder="mode === 'register' ? '至少 6 位' : '请输入密码'"
            required :minlength="mode === 'register' ? 6 : 1"
            @keydown.enter="onSubmit" />
        </div>

        <div v-if="mode === 'register'" class="field">
          <label for="login-password2">确认密码</label>
          <input id="login-password2" type="password" v-model="password2"
            autocomplete="new-password"
            :disabled="loading"
            class="input-field"
            placeholder="再输一次密码"
            required minlength="6" />
        </div>

        <button type="submit"
          class="submit-btn"
          :disabled="loading || !username || !password || (mode === 'register' && !password2)">
          <span v-if="loading">{{ mode === 'register' ? '注册中...' : '登录中...' }}</span>
          <span v-else>{{ mode === 'register' ? '注册并登录' : '登录' }}</span>
        </button>
      </form>

      <p v-if="mode === 'register'" class="register-hint">
        注册后立即登录，无需再次输入密码
      </p>
    </div>

    <!-- 底部联系信息 -->
    <div class="login-footer">
      <span>联系作者: 邮箱 3351247805@qq.com · GitHub ayf-master</span>
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

<style scoped>
/* ===== Root: full-screen gradient backdrop ===== */
.login-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--login-bg, linear-gradient(135deg, #F5F3F0 0%, #EEF0F6 50%, #F1F4FA 100%));
}

/* ===== Decorative glow orbs ===== */
.glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  will-change: transform;
  animation: glowFloat 8s ease-in-out infinite alternate;
}
.glow-1 {
  width: 450px;
  height: 450px;
  top: -10%;
  right: -8%;
  background: radial-gradient(circle, rgba(91, 110, 245, 0.12) 0%, transparent 70%);
}
.glow-2 {
  width: 380px;
  height: 380px;
  bottom: -8%;
  left: -6%;
  background: radial-gradient(circle, rgba(197, 138, 45, 0.08) 0%, transparent 70%);
}

@keyframes glowFloat {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(20px, -20px) scale(1.08); }
}

/* ===== Card ===== */
.login-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 44px 40px 36px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ===== Logo area ===== */
.logo-area {
  text-align: center;
  margin-bottom: 28px;
}
.logo-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  color: var(--color-primary);
  background: var(--color-primary-subtle);
}
.logo-icon svg {
  width: 26px;
  height: 26px;
}
.logo-area h1 {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  margin: 0 0 4px;
}
.logo-area p {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  margin: 0;
}

/* ===== Tab bar ===== */
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--bg-panel);
}
.tab-btn {
  flex: 1;
  padding: 8px 0;
  font-size: 0.875rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-tertiary);
  background: transparent;
}
.tab-btn.active {
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.tab-btn:not(.active):hover {
  color: var(--text-secondary);
}

/* ===== Error message ===== */
.error-msg {
  margin-bottom: 20px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  border: 1px solid currentColor;
}

/* ===== Form fields ===== */
.field {
  margin-bottom: 18px;
}
.field label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-secondary);
}
.field .optional {
  color: var(--text-tertiary);
  font-weight: 400;
}
.input-field {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.875rem;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.input-field::placeholder { color: var(--text-tertiary); }
.input-field:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-subtle);
  background: var(--bg-panel);
}
.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Submit button ===== */
.submit-btn {
  width: 100%;
  padding: 12px 0;
  margin-top: 4px;
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-primary);
  color: var(--text-on-primary);
}
.submit-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  box-shadow: 0 4px 14px rgba(91, 110, 245, 0.3);
  transform: translateY(-1px);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Hint ===== */
.register-hint {
  text-align: center;
  font-size: 0.75rem;
  margin-top: 24px;
  color: var(--text-tertiary);
}

/* ===== Footer ===== */
.login-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  padding: 14px 0;
}
.login-footer span {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  opacity: 0.7;
}

/* ===== Dark mode ===== */
:global([data-theme="dark"]) .login-root {
  background: linear-gradient(135deg, #0F1117 0%, #141722 50%, #181B24 100%);
}
:global([data-theme="dark"]) .glow-1 {
  background: radial-gradient(circle, rgba(124, 140, 248, 0.10) 0%, transparent 70%);
}
:global([data-theme="dark"]) .glow-2 {
  background: radial-gradient(circle, rgba(212, 160, 67, 0.06) 0%, transparent 70%);
}
</style>
