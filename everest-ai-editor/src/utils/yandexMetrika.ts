/**
 * Yandex Metrika event tracking utility
 * ID счетчика: 104338022
 */

declare global {
  interface Window {
    ym?: (counterId: number, method: string, target: string, params?: any) => void;
    yaCounter104338022?: {
      reachGoal: (target: string, params?: any) => void;
      hit: (url: string, params?: any) => void;
    };
  }
}

/**
 * Отправка события достижения цели в Яндекс Метрику
 * 
 * @param goalName - Идентификатор цели (должен совпадать с идентификатором в Яндекс Метрике)
 * @param params - Дополнительные параметры (например, order_price, currency)
 */
export function trackGoal(goalName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Метод 1: через ym() - основной метод
    if (window.ym) {
      window.ym(104338022, 'reachGoal', goalName, params);
      console.log('✅ Yandex Metrika goal sent (ym):', goalName, params);
    } else {
      // Если ym еще не загружен, ждем его загрузки
      const checkYm = setInterval(() => {
        if (window.ym) {
          clearInterval(checkYm);
          window.ym(104338022, 'reachGoal', goalName, params);
          console.log('✅ Yandex Metrika goal sent (ym, delayed):', goalName, params);
        }
      }, 100);
      
      // Останавливаем проверку через 5 секунд
      setTimeout(() => clearInterval(checkYm), 5000);
    }
    
    // Метод 2: через yaCounter (если доступен) - дополнительный метод
    if (window.yaCounter104338022 && window.yaCounter104338022.reachGoal) {
      window.yaCounter104338022.reachGoal(goalName, params);
      console.log('✅ Yandex Metrika goal sent (yaCounter):', goalName, params);
    }
  } catch (error) {
    console.error('❌ Error tracking Yandex Metrika goal:', error, goalName);
  }
}

/**
 * События для отслеживания
 * 
 * ВАЖНО: Эти идентификаторы должны совпадать с идентификаторами целей в Яндекс Метрике!
 * При создании целей в Метрике используйте эти же идентификаторы.
 */
export const YM_EVENTS = {
  // Авторизация
  AUTH_LOGIN: 'auth_login',
  AUTH_REGISTER: 'auth_register', // Регистрация нового пользователя
  AUTH_TELEGRAM: 'auth_telegram',
  
  // Использование AI
  AI_ASSISTANT_USE: 'ai_assistant_use', // Любое использование AI ассистента
  AI_FIRST_REQUEST: 'ai_first_request', // Первый запрос к AI ассистенту
  AI_GIGACHAT_PRO_ATTEMPT: 'ai_gigachat_pro_attempt', // Попытка использовать GigaChat Pro
  AI_GIGACHAT_MAX_ATTEMPT: 'ai_gigachat_max_attempt', // Попытка использовать GigaChat Max
  
  // Скачивание файла
  FILE_DOWNLOAD: 'file_download',

  // Интерфейс: открытие окна обратной связи по клику на логотип Beta
  FEEDBACK_OPEN: 'feedback_open', // Нажатие на кнопку Beta
} as const;

