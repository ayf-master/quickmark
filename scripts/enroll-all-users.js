/**
 * 为所有用户注册复习卡 + 设到期
 * 用法: node scripts/enroll-all-users.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true } });

  for (const u of users) {
    const notes = await prisma.note.findMany({ where: { userId: u.id }, select: { id: true } });
    let created = 0;
    for (const n of notes) {
      const exist = await prisma.reviewCard.findFirst({ where: { noteId: n.id, userId: u.id } });
      if (!exist) {
        await prisma.reviewCard.create({
          data: { noteId: n.id, userId: u.id, dueDate: new Date(Date.now() - 86400000) }
        });
        created++;
      } else {
        // 已存在, 设为到期
        await prisma.reviewCard.updateMany({
          where: { noteId: n.id, userId: u.id },
          data: { dueDate: new Date(Date.now() - 86400000) }
        });
      }
    }
    console.log(`[${u.username}] ${notes.length} 篇笔记 → ${created} 张新卡, 其余已设到期`);
  }

  console.log('\n✅ 全部完成! 刷新页面即可查看到期高亮效果');
  await prisma.$disconnect();
}
main().catch(console.error);
