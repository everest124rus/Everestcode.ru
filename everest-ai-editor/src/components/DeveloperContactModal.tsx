import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { X, Send, Mail } from 'lucide-react';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h2`
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const InfoText = styled.div`
  color: #fff;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;

  strong {
    color: #fff;
    font-weight: 600;
  }

  ul {
    margin: 12px 0;
    padding-left: 24px;
    color: #fff;
  }

  li {
    margin: 6px 0;
    color: #fff;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 16px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const SendButton = styled.button<{ disabled?: boolean }>`
  background: ${props => props.disabled ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const CancelButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const SuccessMessage = styled.div`
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.5);
  border-radius: 8px;
  padding: 12px;
  color: #4caf50;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
`;

const ErrorMessage = styled.div`
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.5);
  border-radius: 8px;
  padding: 12px;
  color: #f44336;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
`;

interface DeveloperContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeveloperContactModal: React.FC<DeveloperContactModalProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/developer/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки сообщения');
      }

      setSuccess(true);
      setMessage('');
      
      // Закрываем модальное окно через 2 секунды
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Не удалось отправить сообщение. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Отправка по Enter (без Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isLoading) {
        handleSubmit();
      }
    }
    // Закрытие по Escape
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Mail size={20} />
            Связь с разработчиком
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <InfoText>
          <p style={{ marginBottom: '12px' }}>
            Все предупреждения, ошибки, критика и предложения, а также обратная связь — можете вводить напрямую главному разработчику.
          </p>
          <p style={{ marginBottom: '12px', fontWeight: 600 }}>
            Все что вы напишите в окно будет оперативно доставлено и исправлено.
          </p>
          <strong>💡 Что можно написать:</strong>
          <ul>
            <li>Предложения по улучшению функционала</li>
            <li>Сообщения об ошибках и багах</li>
            <li>Критика и пожелания</li>
            <li>Любые другие вопросы</li>
          </ul>
        </InfoText>

        {success && (
          <SuccessMessage>
            ✅ Сообщение успешно отправлено! Спасибо за обратную связь.
          </SuccessMessage>
        )}

        {error && (
          <ErrorMessage>
            ❌ {error}
          </ErrorMessage>
        )}

        <TextArea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите ваше сообщение..."
          disabled={isLoading}
        />

        <ButtonContainer>
          <CancelButton onClick={onClose} disabled={isLoading}>
            Отмена
          </CancelButton>
          <SendButton onClick={handleSubmit} disabled={!message.trim() || isLoading}>
            <Send size={16} />
            {isLoading ? 'Отправка...' : 'Отправить (Enter)'}
          </SendButton>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DeveloperContactModal;

