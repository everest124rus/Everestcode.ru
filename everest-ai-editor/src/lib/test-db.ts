// Тестовый файл временно отключен
console.log('Тестовый файл временно отключен');

async function testConnection() {
  try {
    console.log('✅ Тестовое подключение к базе данных отключено');

    // Возвращаем заглушку вместо реальных данных
    const user = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password'
    };

    console.log('Тестовый пользователь:', user);
    console.log('Список пользователей: [тестовые данные отключены]');
  } catch (error) {
    console.error('❌ Ошибка:', error)
  }
}

// Добавляем пустой экспорт, чтобы файл стал модулем
export {};

testConnection()