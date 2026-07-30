// 真实发信验证脚本 — 跑: node scripts/test-email.js
// 作用: 用 .env 里的 QQ SMTP 配置, 给自己的邮箱发一封测试邮件, 确认链路通
require('dotenv').config();
const { sendPasswordResetEmail, isRealSmtp } = require('../prisma/email');

if (!isRealSmtp()) {
  console.error('❌ 未检测到 SMTP 配置, 请检查 .env 里的 SMTP_HOST / SMTP_USER / SMTP_PASS');
  process.exit(1);
}

const to = process.env.SMTP_USER; // 发给自己, 方便验证
const base = process.env.APP_BASE_URL || 'http://localhost:5173';
const resetUrl = base + '/reset?token=TEST123';

console.log('发信到:', to);
console.log('重置链接:', resetUrl);

sendPasswordResetEmail({ to, resetUrl, username: 'QuickMark测试' })
  .then((info) => {
    console.log('✅ 发送成功! messageId =', info.messageId);
    console.log('去你的 QQ 邮箱查收一下吧 (可能在收件箱或垃圾箱)');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 发送失败:');
    console.error(err.message || err);
    if (err.code === 'EAUTH') {
      console.error('→ 授权码不对或被风控, 重新去 QQ 邮箱生成授权码再试');
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      console.error('→ 网络连不上 smtp.qq.com, 检查本机网络/代理');
    }
    process.exit(1);
  });
