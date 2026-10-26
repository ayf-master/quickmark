// src/utils/sentry.js
// 错误追踪接入层 — 仅在 SENTRY_DSN 存在时初始化 @sentry/node, 否则零开销 no-op。
// 这样即使还没注册 Sentry 账号, 也不影响 CI / 本地 / 生产运行 (不抛错、不联网)。

const logger = require('./logger');

let Sentry = null;
let enabled = false;

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // 未配置: 静默跳过, 全应用保持无 Sentry 行为
    return;
  }
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || 'unknown',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      // 不上报主机名等可能暴露内网拓扑的字段
      serverName: 'quickmark-server',
      // 采样化掉不太有用的内部日志
      ignoreErrors: ['PrismaClientKnownRequestError']
    });

    // 进程级兜底: 未捕获异常 / Promise rejection 都上报
    process.on('unhandledRejection', (reason) => {
      Sentry.captureException(reason);
    });
    process.on('uncaughtException', (err) => {
      Sentry.captureException(err);
    });

    enabled = true;
    logger.info('[Sentry] 已初始化 (environment=%s)', process.env.NODE_ENV || 'development');
  } catch (err) {
    // 依赖没装 / 初始化失败, 降级为无上报, 不影响主流程
    logger.error('[Sentry] 初始化失败, 已降级为无上报:', err.message);
  }
}

function captureException(err, context) {
  if (enabled && Sentry) Sentry.captureException(err, context);
}

function getSentry() {
  return enabled ? Sentry : null;
}

module.exports = {
  initSentry,
  captureException,
  getSentry,
  isEnabled: () => enabled
};
