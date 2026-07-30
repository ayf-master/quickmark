// 给 aaa 用户创建测试笔记 + 到期复习卡
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'aaa' } });
  if (!user) { console.log('用户 aaa 不存在'); return; }

  const notes = [
    { title: 'Vue3 响应式原理', content: 'Vue3 使用 Proxy 替代 Object.defineProperty，实现更全面的响应式追踪。' },
    { title: 'SM-2 算法', content: 'SM-2 是 SuperMemo 2 算法，用于间隔重复复习调度，基于用户反馈调整间隔。' },
    { title: 'CSS Grid 布局', content: 'CSS Grid 是二维布局系统，支持行和列同时控制，比 Flexbox 更适合整体页面布局。' },
    { title: 'HTTP 缓存策略', content: '强缓存 (Cache-Control) 和协商缓存 (ETag/Last-Modified) 两大类。' },
    { title: 'JavaScript 闭包', content: '闭包是指内部函数可以访问外部函数作用域的变量，即使外部函数已执行完毕。' },
  ];

  for (const n of notes) {
    const note = await prisma.note.create({
      data: { title: n.title, content: n.content, userId: user.id }
    });
    await prisma.reviewCard.create({
      data: { noteId: note.id, userId: user.id, dueDate: new Date(Date.now() - 30 * 86400000) }  // 30 天前过期
    });
    console.log('✅ ' + n.title);
  }

  console.log('\n全部完成! 刷新页面即可;');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
