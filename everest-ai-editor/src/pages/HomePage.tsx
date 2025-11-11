import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl, authHeaders } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const HomeContainer = styled.div<{ theme: 'light' | 'dark' }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: ${props => props.theme === 'light' 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)'
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #e94560 100%)'
  };
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  
  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

const Title = styled.h1`
  font-size: 4rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
`;

const Subtitle = styled.p`
  font-size: 1.5rem;
  margin-bottom: 3rem;
  text-align: center;
  opacity: 0.9;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 1rem 2rem;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  min-width: 200px;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ThemeToggle = styled.button`
  position: absolute;
  top: 2rem;
  right: 2rem;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50px;
  padding: 0.5rem 1rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

// Glass modal styles
const GlassBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const GlassModal = styled.div`
  width: min(560px, 92vw);
  border-radius: 16px;
  padding: 24px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.25);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  color: #fff;
  backdrop-filter: blur(14px);
`;

const ModalTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 700;
`;

const ModalSubtitle = styled.p`
  margin: 0 0 16px 0;
  opacity: 0.85;
`;

const IdeaInput = styled.textarea`
  width: 100%;
  min-height: 96px;
  resize: vertical;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.25);
  background: rgba(0,0,0,0.25);
  color: #fff;
  font-size: 14px;
  outline: none;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
`;

const SecondaryButton = styled.button`
  background: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
`;

const PrimaryButton = styled.button`
  background: #0088cc;
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: background .2s ease;
  &:hover { background: #0077bb; }
  &:disabled { opacity: .7; cursor: default; }
`;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [welcomeTheme, setWelcomeTheme] = useState<'light' | 'dark'>('dark');
  const { token } = useAuth();
  const [isIdeaOpen, setIsIdeaOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleTheme = () => {
    setWelcomeTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleStartCoding = () => {
    setIsIdeaOpen(true);
  };

  const handleLearnMore = () => {
    // Можно добавить модальное окно или переход на страницу информации
    alert('Добро пожаловать в Everest Code! Это современный веб-редактор с поддержкой ИИ.');
  };

  const handleFileSharing = () => {
    navigate('/files');
  };

  return (
    <HomeContainer theme={welcomeTheme}>
      <ThemeToggle onClick={toggleTheme}>
        {welcomeTheme === 'light' ? '🌙' : '☀️'} {welcomeTheme === 'light' ? 'Темная тема' : 'Светлая тема'}
      </ThemeToggle>
      
      <Title>Everest Code</Title>
      <Subtitle>Современный веб-редактор с поддержкой ИИ</Subtitle>
      
      <ButtonGroup>
        <ActionButton onClick={handleStartCoding}>
          🚀 Начать программировать
        </ActionButton>
        <ActionButton onClick={handleFileSharing}>
          📤 Отправить файлы в Telegram
        </ActionButton>
        <ActionButton onClick={handleLearnMore}>
          📚 Узнать больше
        </ActionButton>
      </ButtonGroup>

      {isIdeaOpen && (
        <GlassBackdrop onClick={() => !isSubmitting && setIsIdeaOpen(false)}>
          <GlassModal onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Какую идею хотите воплотить?</ModalTitle>
            <ModalSubtitle>
              Мы подготовим стартовые рекомендации с помощью GigaChat Lite.
            </ModalSubtitle>
            <IdeaInput
              placeholder="Опишите кратко задачу или идею проекта..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            {submitError && (
              <div style={{ color: '#ff6b6b', marginTop: 8 }}>{submitError}</div>
            )}
            <ModalActions>
              <SecondaryButton onClick={() => setIsIdeaOpen(false)} disabled={isSubmitting}>Отмена</SecondaryButton>
              <PrimaryButton
                disabled={!idea.trim() || isSubmitting}
                onClick={async () => {
                  if (!idea.trim()) return;
                  setIsSubmitting(true);
                  setSubmitError(null);
                  try {
                    // Сохраним будущий диалог в localStorage, чтобы он показался в AI панели
                    const initMessages = [
                      { role: 'user', content: idea.trim() }
                    ];

                    const headers = authHeaders(token || undefined);
                    const res = await fetch(buildApiUrl('/ai/chat'), {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({ message: idea.trim(), provider: 'GigaChat-2' })
                    });

                    if (res.ok) {
                      const data = await res.json();
                      // Проверяем, что ответ действительно есть
                      if (data.response && data.response.trim()) {
                        const withAssistant = initMessages.concat([{ role: 'assistant', content: data.response }]);
                        localStorage.setItem('aiMessages', JSON.stringify(withAssistant));
                      } else {
                        // Если ответ пустой, сохраняем сообщение об ошибке
                        const withError = initMessages.concat([{ 
                          role: 'assistant', 
                          content: '⚠️ ИИ не вернул ответ. Попробуйте отправить сообщение еще раз в редакторе или обратитесь к разработчику: @everestalpine' 
                        }]);
                        localStorage.setItem('aiMessages', JSON.stringify(withError));
                      }
                    } else {
                      // Если не ок, получаем текст ошибки
                      let errorMessage = 'Не удалось получить ответ от ИИ. Попробуйте отправить сообщение еще раз в редакторе.';
                      try {
                        const errorData = await res.json();
                        if (errorData.error) {
                          errorMessage = `Ошибка: ${errorData.error}`;
                        }
                      } catch (e) {
                        // Игнорируем ошибку парсинга
                      }
                      // Сохраняем сообщение пользователя и сообщение об ошибке от ассистента
                      const withError = initMessages.concat([{ 
                        role: 'assistant', 
                        content: `⚠️ ${errorMessage}\n\nПопробуйте отправить сообщение еще раз в редакторе или обратитесь к разработчику: @everestalpine` 
                      }]);
                      localStorage.setItem('aiMessages', JSON.stringify(withError));
                      console.warn('AI request failed:', errorMessage);
                    }

                    setIsIdeaOpen(false);
                    navigate('/webcode');
                  } catch (err: any) {
                    // При ошибке сети тоже сохраняем сообщение пользователя с уведомлением об ошибке
                    const initMessages = [
                      { role: 'user', content: idea.trim() },
                      { 
                        role: 'assistant', 
                        content: `⚠️ Произошла ошибка при отправке сообщения: ${err.message || 'Неизвестная ошибка'}\n\nПопробуйте отправить сообщение еще раз в редакторе или обратитесь к разработчику: @everestalpine` 
                      }
                    ];
                    localStorage.setItem('aiMessages', JSON.stringify(initMessages));
                    setSubmitError('Не удалось отправить идею. Попробуйте еще раз.');
                    // Все равно переходим в редактор, чтобы пользователь мог попробовать еще раз
                    setIsIdeaOpen(false);
                    navigate('/webcode');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? 'Отправляем…' : 'Отправить'}
              </PrimaryButton>
            </ModalActions>
          </GlassModal>
        </GlassBackdrop>
      )}
    </HomeContainer>
  );
};

export default HomePage;
