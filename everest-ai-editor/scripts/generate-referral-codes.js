const prisma = require('../lib/prisma');

// Функция генерации реферального кода
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Исключаем похожие символы (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateReferralCodesForExistingUsers() {
  try {
    console.log('🔍 Поиск пользователей без реферального кода...');
    
    const usersWithoutCode = await prisma.user.findMany({
      where: {
        referralCode: null
      }
    });

    console.log(`📊 Найдено пользователей без кода: ${usersWithoutCode.length}`);

    for (const user of usersWithoutCode) {
      let referralCode;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 100) {
        referralCode = generateReferralCode();
        const existing = await prisma.user.findUnique({
          where: { referralCode }
        });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (isUnique) {
        await prisma.user.update({
          where: { id: user.id },
          data: { referralCode }
        });
        console.log(`✅ Сгенерирован код для ${user.username}: ${referralCode}`);
      } else {
        console.error(`❌ Не удалось сгенерировать уникальный код для ${user.username} после ${attempts} попыток`);
      }
    }

    console.log('✅ Генерация реферальных кодов завершена');
  } catch (error) {
    console.error('❌ Ошибка при генерации реферальных кодов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateReferralCodesForExistingUsers();

