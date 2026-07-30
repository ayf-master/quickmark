/**
 * prisma/email.js — 邮件发送 (找回密码用)
 *
 * 设计:
 *   - 优先走真实 SMTP: 配置了 SMTP_HOST + SMTP_USER + SMTP_PASS 时, 用 nodemailer 直连发信
 *     (QQ/163/Gmail/腾讯云 SES 等均可, 主机端口在 .env 配)
 *   - 未配置 SMTP 时回退 Ethereal 测试邮箱: 自动建测试账号, 邮件不进真实收件箱,
 *     而是返回一个可点击的预览链接 (nodemailer.getTestMessageUrl)
 *   - 无论如何, 都把重置链接打印到服务器控制台, 开发期即使邮箱不通也能直接复制测试
 *
 * 这样"开发模式先跑通、以后填 SMTP 切真发信"零改动代码, 只改环境变量。
 */
const nodemailer = require('nodemailer');
const logger = require('../src/utils/logger');

let etherealAccount = null; // 懒加载的 Ethereal 测试账号

/** 取传输器: 有 SMTP 配置用真实, 否则用 Ethereal */
async function getTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false', // 465 用 true, 587 用 false
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }
  // 回退 Ethereal
  if (!etherealAccount) {
    etherealAccount = await nodemailer.createTestAccount();
  }
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: etherealAccount.user, pass: etherealAccount.pass }
  });
}

function isRealSmtp() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * 发送找回密码邮件
 * @param {object} o
 * @param {string} o.to        收件邮箱
 * @param {string} o.resetUrl  重置链接 (含 token)
 * @param {string} [o.username] 用户名 (用于个性化)
 */
async function sendPasswordResetEmail({ to, resetUrl, username }) {
  const transport = await getTransport();
  const from = process.env.MAIL_FROM || (isRealSmtp() ? process.env.SMTP_USER : 'QuickMark <no-reply@quickmark.app>');

  const info = await transport.sendMail({
    from,
    to,
    subject: 'QuickMark · 重置你的密码',
    text:
      `你好${username ? '，' + username : ''}：\n\n` +
      `我们收到了重置密码的请求。请点击下面的链接设置新密码（30 分钟内有效）：\n` +
      `${resetUrl}\n\n` +
      `如果这不是你本人操作，忽略此邮件即可，密码不会变更。`,
    html:
      `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto">` +
      `<h2 style="color:#5b6ef5">QuickMark</h2>` +
      `<p>你好${username ? '，' + username : ''}：</p>` +
      `<p>我们收到了重置密码的请求。点击下方按钮设置新密码（链接 30 分钟内有效）：</p>` +
      `<p style="margin:24px 0">` +
      `<a href="${resetUrl}" style="background:#5b6ef5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">重置密码</a>` +
      `</p>` +
      `<p style="color:#888;font-size:13px">如果按钮无法点击，请复制以下链接到浏览器：<br>${resetUrl}</p>` +
      `<p style="color:#888;font-size:13px">如果这不是你本人操作，忽略此邮件即可，密码不会变更。</p>` +
      `</div>`
  });

  // 开发兜底: 控制台始终打印重置链接, 便于无邮箱环境直接测试
  logger.info('[找回密码] 重置链接: ' + resetUrl + (to ? '  (发送至 ' + to + ')' : ''));
  if (!isRealSmtp()) {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) logger.info('[找回密码] Ethereal 预览(可点击): ' + preview);
  }
  return info;
}

/**
 * 发送验证码邮件 (找回密码用)
 * @param {object} o
 * @param {string} o.to    收件邮箱
 * @param {string} o.code  6 位验证码
 * @param {string} [o.username] 用户名
 */
async function sendCodeEmail({ to, code, username }) {
  const transport = await getTransport();
  const from = process.env.MAIL_FROM || (isRealSmtp() ? process.env.SMTP_USER : 'QuickMark <no-reply@quickmark.app>');

  const info = await transport.sendMail({
    from,
    to,
    subject: 'QuickMark · 验证码',
    text:
      `你好${username ? '，' + username : ''}：\n\n` +
      `你的验证码是: ${code}\n\n` +
      `5 分钟内有效, 请勿泄露给他人。\n\n` +
      `如果这不是你本人操作, 忽略此邮件即可。`,
    html:
      `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto">` +
      `<h2 style="color:#5b6ef5">QuickMark</h2>` +
      `<p>你好${username ? '，' + username : ''}：</p>` +
      `<p>你的验证码是：</p>` +
      `<p style="margin:24px 0;text-align:center">` +
      `<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#5b6ef5;background:#f0f2ff;padding:12px 24px;border-radius:8px;display:inline-block">${code}</span>` +
      `</p>` +
      `<p style="color:#888;font-size:13px">5 分钟内有效, 请勿泄露给他人。</p>` +
      `<p style="color:#888;font-size:13px">如果这不是你本人操作, 忽略此邮件即可。</p>` +
      `</div>`
  });

  logger.info('[验证码] 已发送至 ' + to);
  if (!isRealSmtp()) {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) logger.info('[验证码] Ethereal 预览: ' + preview);
  }
  return info;
}

module.exports = { sendPasswordResetEmail, sendCodeEmail, isRealSmtp };
