import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => (props.$isOpen ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: #1e1e1e;
  border-radius: 12px;
  padding: 32px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  &:hover { background-color: #333; color: #fff; }
`;

const Title = styled.h2`
  color: #fff;
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputGroup = styled.div` display: flex; flex-direction: column; gap: 8px; `;
const Label = styled.label` color: #fff; font-weight: 500; font-size: 14px; `;
const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #2a2a2a;
  color: #fff;
  font-size: 16px;
  &:focus { outline: none; border-color: #0088cc; }
  &::placeholder { color: #999; }
`;

const PasswordInput = styled.div` position: relative; display: flex; align-items: center; `;
const PasswordToggle = styled.button`
  position: absolute; right: 12px; background: none; border: none; color: #999;
  cursor: pointer; padding: 4px; &:hover { color: #fff; }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  ${props => props.$variant === 'primary' ? `
    background: #0088cc; color: white;
    &:hover:not(:disabled) { background: #0066aa; }
  ` : `
    background: #333; color: #fff; border: 1px solid #444;
  `}
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ModeToggle = styled.div` display: flex; gap: 8px; margin-bottom: 24px; `;
const ModeButton = styled.button<{ $active: boolean }>`
  flex: 1; padding: 12px 16px; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer;
  border: 1px solid ${props => props.$active ? '#0088cc' : '#444'};
  background: ${props => props.$active ? '#0088cc' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#fff'};
  &:hover { background: ${props => props.$active ? '#0088cc' : '#333'}; }
`;

const ErrorMessage = styled.div`
  color: #ff6b6b; background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3); border-radius: 8px;
  padding: 12px; font-size: 14px; text-align: center;
`;

const SuccessMessage = styled.div`
  color: #51cf66; background: rgba(81, 207, 102, 0.1);
  border: 1px solid rgba(81, 207, 102, 0.3); border-radius: 8px;
  padding: 12px; font-size: 14px; text-align: center;
`;

const Divider = styled.div`
  display: flex; align-items: center; margin: 24px 0; color: #999;
  font-size: 14px;
  &::before, &::after { content: ''; flex: 1; height: 1px; background: #444; }
  &::before { margin-right: 16px; } &::after { margin-left: 16px; }
`;

const TelegramWidgetContainer = styled.div`
  width: 100%;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  
  /* Стили для Telegram виджета */
  .telegram-login-widget {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    width: 100% !important;
    
    iframe {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
    }
  }
`;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'telegram';
  onAuthSuccess?: (token: string, user: any) => void;
}

const BOT_USERNAME = 'Everest_AI_Codebot';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'telegram'>(initialMode);
  const [widgetMounted, setWidgetMounted] = useState(false);
  const telegramWidgetRef = React.useRef<HTMLDivElement>(null);
  
  // Обновляем режим при изменении initialMode
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { login, register, loginWithTelegram } = useAuth();

  // Определяем глобальную функцию обработки авторизации
  useEffect(() => {
    (window as any).onTelegramAuthModal = async (telegramUser: any) => {
      try {
        const { trackGoal } = await import('../utils/yandexMetrika');
        const { YM_EVENTS } = await import('../utils/yandexMetrika');
        trackGoal(YM_EVENTS.AUTH_TELEGRAM);
        const { buildApiUrl } = await import('../config/api');
        const response = await fetch(buildApiUrl('/auth/telegram'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramData: telegramUser }),
        });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          loginWithTelegram(data.token, data.user);
          onClose();
          window.location.reload();
        } else {
          let errorMessage = 'Не удалось авторизоваться через Telegram.';
          if (response.status === 502) {
            errorMessage = 'Сервер временно недоступен (502 Bad Gateway). Пожалуйста, попробуйте позже или обратитесь к разработчику: @EverestAlpine';
          } else if (response.status === 503) {
            errorMessage = 'Сервис временно недоступен (503 Service Unavailable). Пожалуйста, попробуйте позже.';
          } else if (response.status === 500) {
            errorMessage = 'Внутренняя ошибка сервера (500). Пожалуйста, обратитесь к разработчику: @EverestAlpine';
          }
          console.error('Ошибка авторизации через Telegram:', response.status, errorMessage);
          setError(errorMessage);
        }
      } catch (error: any) {
        console.error('Ошибка авторизации через Telegram:', error);
        setError(`Ошибка авторизации через Telegram: ${error.message || 'Неизвестная ошибка'}`);
      }
    };
  }, [onClose, loginWithTelegram]);
  
  // Инициализируем виджет в контейнере после открытия модалки
  useEffect(() => {
    if (isOpen && telegramWidgetRef.current) {
      // Очищаем контейнер
      telegramWidgetRef.current.innerHTML = '';
      
      // Создаём контейнер для Telegram виджета
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'telegram-login-widget';
      
      // Создаём script элемент с атрибутами (правильный формат для Telegram виджета)
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://telegram.org/js/telegram-widget.js?7';
      script.setAttribute('data-telegram-login', BOT_USERNAME);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuthModal(user)');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-userpic', 'false');
      
      // Вставляем script внутрь контейнера
      widgetContainer.appendChild(script);
      telegramWidgetRef.current.appendChild(widgetContainer);
      
      setWidgetMounted(true);
    } else {
      setWidgetMounted(false);
    }
  }, [isOpen]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const successResult = mode === 'login' ? await login(email, password) : await register(email, password, username);
      if (successResult) {
        setSuccess(mode === 'login' ? 'Вход успешен!' : 'Регистрация успешна!');
        // Фиксация цели Яндекс.Метрики для логина/регистрации
        try {
          const { trackGoal, YM_EVENTS } = await import('../utils/yandexMetrika');
          if (mode === 'register') {
            trackGoal(YM_EVENTS.AUTH_REGISTER); // Регистрация нового пользователя
          } else {
            trackGoal(YM_EVENTS.AUTH_LOGIN); // Вход существующего пользователя
          }
        } catch (e) {
          console.error('Error tracking auth goal:', e);
        }
        setTimeout(() => {
          onClose();
          setEmail(''); setPassword(''); setUsername('');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalOverlay $isOpen={isOpen}>
      <ModalContent>
        <CloseButton onClick={onClose}><X size={20} /></CloseButton>
        <Title>{mode === 'login' ? 'Вход в аккаунт' : mode === 'register' ? 'Регистрация' : 'Вход через Telegram'}</Title>
        
        {mode !== 'telegram' && (
          <>
            <ModeToggle>
              <ModeButton $active={mode === 'login'} onClick={() => setMode('login')}>Вход</ModeButton>
              <ModeButton $active={mode === 'register'} onClick={() => setMode('register')}>Регистрация</ModeButton>
            </ModeToggle>

            <Form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <InputGroup>
              <Label htmlFor="username">Имя пользователя</Label>
              <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Имя пользователя" required />
            </InputGroup>
          )}
          <InputGroup>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          </InputGroup>
          <InputGroup>
            <Label htmlFor="password">Пароль</Label>
            <PasswordInput>
              <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required />
              <PasswordToggle type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</PasswordToggle>
            </PasswordInput>
          </InputGroup>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
          <Button type="submit" $variant="primary" disabled={isLoading}>{isLoading ? '⏳' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</Button>
        </Form>
        
        <Divider>или</Divider>
        </>
        )}
        
        <TelegramWidgetContainer>
          <div ref={telegramWidgetRef} />
        </TelegramWidgetContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default AuthModal;
