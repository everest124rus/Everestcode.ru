import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { buildApiUrl } from '../config/api';
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
  &:hover { 
    background-color: #333; 
    color: #fff; 
  }
`;

const Title = styled.h2`
  color: #fff;
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
`;

const Label = styled.label`
  color: #fff;
  font-weight: 500;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #2a2a2a;
  color: #fff;
  font-size: 16px;
  &:focus { 
    outline: none; 
    border-color: #0088cc; 
  }
  &::placeholder { 
    color: #999; 
  }
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
  width: 100%;
  ${props => props.$variant === 'primary' ? `
    background: #0088cc; 
    color: white;
    &:hover:not(:disabled) { 
      background: #0066aa; 
    }
  ` : `
    background: #333; 
    color: #fff; 
    border: 1px solid #444;
    &:hover { 
      background: #444; 
    }
  `}
  &:disabled { 
    opacity: 0.6; 
    cursor: not-allowed; 
  }
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  text-align: center;
  margin-bottom: 16px;
`;

const SuccessMessage = styled.div`
  color: #51cf66;
  background: rgba(81, 207, 102, 0.1);
  border: 1px solid rgba(81, 207, 102, 0.3);
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  text-align: center;
  margin-bottom: 16px;
`;

const InfoText = styled.p`
  color: #999;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
  text-align: center;
`;

const QRCodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 12px;
  border: 1px solid #444;
`;

const QRCodeWrapper = styled.div`
  padding: 16px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 200px;
  min-height: 200px;
  width: 200px;
  height: 200px;
`;

const QRCodeText = styled.p`
  color: #fff;
  font-size: 12px;
  text-align: center;
  margin: 0;
  line-height: 1.4;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 20px 0;
  color: #666;
  font-size: 14px;
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #444;
  }
  &::before {
    margin-right: 16px;
  }
  &::after {
    margin-left: 16px;
  }
`;

interface TelegramUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

const TelegramUsernameModal: React.FC<TelegramUsernameModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  token 
}) => {
  const { user, loginWithTelegram } = useAuth();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Генерируем ссылку для QR-кода с автоподстановкой команды /link
  const telegramLink = useMemo(() => {
    if (!user?.username) return null;
    // Формат: https://t.me/bot_username?start=link_username
    return `https://t.me/Everest_AI_Codebot?start=link_${user.username}`;
  }, [user?.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!username.trim()) {
      setError('Введите ваш Telegram username');
      setIsLoading(false);
      return;
    }

    // Убираем @ если пользователь его ввел
    const cleanUsername = username.trim().replace(/^@/, '');

    try {
      const response = await fetch(buildApiUrl('/user/update-telegram-username'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ telegramUsername: cleanUsername }),
      });

      const data = await response.json();

      if (response.ok) {
        // Обновляем пользователя в контексте
        if (user && data.user) {
          const updatedUser = { ...user, ...data.user };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          loginWithTelegram(token || '', updatedUser);
        }
        
        setSuccess(`Telegram username успешно сохранен! Отсканируйте QR-код ниже для автоматической связи аккаунта.`);
        setUsername('');
        // Не закрываем модальное окно, чтобы пользователь мог отсканировать QR-код
      } else {
        setError(data.error || 'Ошибка при сохранении username');
      }
    } catch (err: any) {
      setError(`Ошибка: ${err.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay $isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>
        <Title>Укажите Telegram username</Title>
        <InfoText>
          Введите ваш Telegram username (без @), чтобы получать файлы в Telegram.
          Например: <strong>your_username</strong>
        </InfoText>
        
        <form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="telegram-username">Telegram Username</Label>
            <Input
              id="telegram-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              required
            />
          </InputGroup>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
          
          <Button type="submit" $variant="primary" disabled={isLoading}>
            {isLoading ? '⏳ Сохранение...' : 'Сохранить'}
          </Button>
        </form>

        {user?.username && telegramLink && (
          <>
            <Divider>или</Divider>
            <QRCodeContainer>
              <QRCodeText>
                <strong>📱 Отсканируйте QR-код</strong>
                <br />
                для быстрого перехода к боту
                <br />
                и автоматической связи аккаунта
              </QRCodeText>
              <QRCodeWrapper>
                <img 
                  src="/telegram-qr.png" 
                  alt="QR код для связи с Telegram ботом"
                  style={{ 
                    width: '200px', 
                    height: '200px', 
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </QRCodeWrapper>
              <QRCodeText>
                Откройте Telegram и отсканируйте код
                <br />
                Бот автоматически свяжет ваш аккаунт!
                <br />
                <br />
                <small style={{ color: '#666' }}>
                  Или отправьте команду: <strong>/link {user.username}</strong>
                </small>
              </QRCodeText>
            </QRCodeContainer>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default TelegramUsernameModal;

