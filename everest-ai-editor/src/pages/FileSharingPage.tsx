import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import FileSender from '../components/FileSender';
import { buildApiUrl } from '../config/api';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #e94560 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
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

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
`;

const UserEmail = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(220, 53, 69, 0.8);
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(220, 53, 69, 1);
    transform: translateY(-2px);
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: calc(100vh - 80px);
`;

const AuthPrompt = styled.div`
  text-align: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
`;

const Description = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  text-align: center;
  opacity: 0.9;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  max-width: 600px;
`;

const TelegramWidgetContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`;

const BOT_USERNAME = 'Everest_AI_Codebot';

const FileSharingPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetMounted, setWidgetMounted] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Загружаем Telegram виджет скрипт
    if (!widgetMounted) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.onload = () => setWidgetMounted(true);
      document.body.appendChild(script);

      // Глобальная функция для обработки авторизации через Telegram
      (window as any).onTelegramAuth = async (telegramUser: any) => {
        try {
          const response = await fetch(buildApiUrl('/auth/telegram'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramData: telegramUser }),
          });
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
          } else {
            // Обрабатываем ошибки сервера
            let errorMessage = 'Не удалось авторизоваться через Telegram.';
            if (response.status === 502) {
              errorMessage = 'Сервер временно недоступен (502 Bad Gateway). Пожалуйста, попробуйте позже или обратитесь к разработчику: @EverestAlpine';
            } else if (response.status === 503) {
              errorMessage = 'Сервис временно недоступен (503 Service Unavailable). Пожалуйста, попробуйте позже.';
            } else if (response.status === 500) {
              errorMessage = 'Внутренняя ошибка сервера (500). Пожалуйста, обратитесь к разработчику: @EverestAlpine';
            }
            console.error('Ошибка авторизации через Telegram:', response.status, errorMessage);
            alert(`Ошибка авторизации:\n\n${errorMessage}`);
          }
        } catch (error: any) {
          console.error('Ошибка авторизации через Telegram:', error);
          alert(`Ошибка авторизации через Telegram:\n\n${error.message || 'Неизвестная ошибка'}\n\nЕсли проблема повторяется, обратитесь к разработчику: @EverestAlpine`);
        }
      };

      return () => {
        delete (window as any).onTelegramAuth;
      };
    }
  }, [widgetMounted]);

  const checkAuth = () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Ошибка парсинга данных пользователя:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const handleFileSent = (fileShare: any) => {
    console.log('Файл отправлен:', fileShare);
  };

  if (isLoading) {
    return (
      <Container>
        <MainContent>
          <div style={{ fontSize: '1.5rem' }}>Загрузка...</div>
        </MainContent>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          Назад
        </BackButton>

        {user ? (
          <UserInfo>
            <UserDetails>
              <UserName>
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.username
                }
              </UserName>
              {user.telegramUsername && (
                <UserEmail>@{user.telegramUsername}</UserEmail>
              )}
            </UserDetails>
            <LogoutButton onClick={handleLogout}>
              <LogOut size={20} />
              Выйти
            </LogoutButton>
          </UserInfo>
        ) : null}
      </Header>

      <MainContent>
        <Title>📤 Отправка файлов в Telegram</Title>
        <Description>
          Загрузите файлы и отправьте их прямо в свой Telegram чат. 
          Поддерживаются все типы файлов до 50MB.
        </Description>

        {user ? (
          <FileSender 
            token={token!} 
            onFileSent={handleFileSent}
          />
        ) : (
          <AuthPrompt>
            <h3 style={{ marginBottom: '1rem' }}>🔐 Требуется авторизация</h3>
            <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
              Войдите в систему через Telegram
            </p>
            <TelegramWidgetContainer>
              {widgetMounted && (
                <div
                  className="telegram-login-widget"
                  data-telegram-login={BOT_USERNAME}
                  data-size="large"
                  data-onauth="onTelegramAuth(user)"
                  data-request-access="write"
                />
              )}
            </TelegramWidgetContainer>
          </AuthPrompt>
        )}
      </MainContent>
    </Container>
  );
};

export default FileSharingPage;
