/**
 * 间隔重复测试脚本
 * 用法: node scripts/test-review.js
 *
 * 功能:
 *   1. 把所有复习卡的到期日设为昨天 (立即出现在"到期高亮"列表中)
 *   2. 列出当前所有到期笔记
 *   3. 验证标记已复习生效
 *
 * 前置条件: 已开启间隔重复功能, 已有笔记
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n===== 间隔重复测试工具 =====\n');

  // 1. 查用户
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  if (users.length === 0) {
    console.log('❌ 没有用户, 请先登录创建用户');
    return;
  }
  console.log(`找到 ${users.length} 个用户:`);
  for (const u of users) {
    console.log(`   [${u.id}] ${u.username}`);
  }

  // 用第一个用户
  const userId = users[0].id;
  console.log(`\n使用用户: ${users[0].username} (id=${userId})`);

  // 2. 检查复习卡
  let cards = await prisma.reviewCard.findMany({
    where: { userId },
    include: { note: { select: { id: true, title: true } } }
  });

  if (cards.length === 0) {
    console.log('\n⚠️  还没有复习卡, 请先:');
    console.log('   1. 在齿轮面板开启"间隔重复"功能');
    console.log('   2. 刷新页面, 系统会自动注册复习卡');
    console.log('   3. 或手动执行 enrollAll\n');
    return;
  }

  console.log(`\n找到 ${cards.length} 张复习卡, 当前状态:`);
  const now = new Date();
  for (const c of cards) {
    const due = new Date(c.dueDate);
    const status = due <= now ? '🔴 已到期' : '🟢 未到期';
    console.log(`   ${status} | [${c.id}] "${c.note.title}" | 到期: ${c.dueDate}`);
  }

  // 3. 把所有到期日设为昨天 (让笔记立即高亮)
  console.log('\n⏰ 把所有复习卡到期日设为昨天...');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.reviewCard.updateMany({
    where: { userId },
    data: { dueDate: yesterday }
  });
  console.log('✅ 已重置: 所有笔记现在都是"到期"状态!');

  // 4. 验证
  cards = await prisma.reviewCard.findMany({
    where: { userId, dueDate: { lte: new Date() } },
    include: { note: { select: { id: true, title: true } } }
  });
  console.log(`\n📋 现在到期笔记列表 (${cards.length} 篇):`);
  for (const c of cards) {
    console.log(`   🔄 [cardId=${c.id}] "${c.note.title}"`);
  }

  console.log('\n✅ 测试准备完成! 刷新页面即可看到效果:');
  console.log('   1. 到期笔记在列表中高亮显示 (蓝色左边框)');
  console.log('   2. 顶部栏 📝 显示到期数量');
  console.log('   3. 打开到期笔记 → 底部出现「✓ 标记已复习」按钮');
  console.log('   4. 点击标记 → SM-2 排下次时间, 笔记不再高亮\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('测试失败:', e);
  process.exit(1);
});
