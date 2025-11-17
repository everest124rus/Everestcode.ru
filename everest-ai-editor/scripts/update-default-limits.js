const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  let changed = 0;
  for (const user of users) {
    let update = {};
    if (user.tokensType1 < 20) update.tokensType1 = 20;
    if (user.tokensType2 < 5) update.tokensType2 = 5;
    if (user.tokensType3 !== 0) update.tokensType3 = 0;
    if (Object.keys(update).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: update
      });
      console.log(`Обновлён: ${user.username} (id=${user.id}) →`, update);
      changed++;
    }
  }
  console.log(`Всего обновлено пользователей: ${changed}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
