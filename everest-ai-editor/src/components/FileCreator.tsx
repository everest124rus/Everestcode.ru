import React, { useState } from 'react';
import styled from 'styled-components';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Plus, File, Folder, X } from 'lucide-react';

interface FileCreatorProps {
  onCreateFile: (name: string) => void;
  onCreateFolder: (name: string) => void;
}

const CreatorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
`;

const CreatorTitle = styled.h2`
  color: ${props => props.theme.colors.text} !important;
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 600;
`;

const CreatorSubtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary} !important;
  margin-bottom: 32px;
  font-size: 16px;
`;

const CreatorButtons = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
`;

const CreatorButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background-color: ${props => props.theme.colors.surface};
  border: 2px dashed ${props => props.theme.colors.border};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background-color: ${props => props.theme.colors.primary}10;
  }
`;

const CreatorIcon = styled.div`
  color: ${props => props.theme.colors.primary};
`;

const CreatorLabel = styled.span`
  color: ${props => props.theme.colors.text} !important;
  font-size: 14px;
  font-weight: 500;
`;

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.colors.background};
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  box-shadow: ${props => props.theme.shadows.large};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h3`
  color: ${props => props.theme.colors.text} !important;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary} !important;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text} !important;
  }
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const InputLabel = styled.label`
  display: block;
  color: ${props => props.theme.colors.text} !important;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text} !important;
  font-size: 14px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    color: ${props => props.theme.colors.textSecondary} !important;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.$variant === 'primary' ? `
    background-color: ${props.theme.colors.primary};
    color: ${props.theme.colors.aiUserMessageText};

    &:hover {
      background-color: ${props.theme.colors.primaryHover};
    }
  ` : `
    background-color: ${props.theme.colors.surface};
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border};

    &:hover {
      background-color: ${props.theme.colors.background};
    }
  `}
`;

const FileCreator: React.FC<FileCreatorProps> = ({
  onCreateFile,
  onCreateFolder
}) => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'file' | 'folder'>('file');
  const [inputValue, setInputValue] = useState('');

  const handleCreate = (type: 'file' | 'folder') => {
    setModalType(type);
    setInputValue('');
    setShowModal(true);
  };

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    const fallbackName = modalType === 'file' ? 'File1' : 'Folder1';
    const finalName = trimmed.length > 0 ? trimmed : fallbackName;

    if (modalType === 'file') {
      onCreateFile(finalName);
    } else {
      onCreateFolder(finalName);
    }
    setShowModal(false);
    setInputValue('');
  };

  const handleCancel = () => {
    setShowModal(false);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <>
      <CreatorContainer>
        <CreatorTitle>Добро пожаловать в Everest AI Editor</CreatorTitle>
        <CreatorSubtitle>
          Создайте файл или папку для начала работы
        </CreatorSubtitle>
        
        <CreatorButtons>
          <CreatorButton onClick={() => handleCreate('file')}>
            <CreatorIcon>
              <File size={32} />
            </CreatorIcon>
            <CreatorLabel>Создать файл</CreatorLabel>
          </CreatorButton>
          
          <CreatorButton onClick={() => handleCreate('folder')}>
            <CreatorIcon>
              <Folder size={32} />
            </CreatorIcon>
            <CreatorLabel>Создать папку</CreatorLabel>
          </CreatorButton>
        </CreatorButtons>
      </CreatorContainer>

      <ModalOverlay $isOpen={showModal} onClick={handleCancel}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>
              Создать {modalType === 'file' ? 'файл' : 'папку'}
            </ModalTitle>
            <CloseButton onClick={handleCancel}>
              <X size={20} />
            </CloseButton>
          </ModalHeader>

          <InputGroup>
            <InputLabel>
              Имя {modalType === 'file' ? 'файла' : 'папки'}
            </InputLabel>
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Введите имя ${modalType === 'file' ? 'файла' : 'папки'}`}
              autoFocus
            />
          </InputGroup>

          <ButtonGroup>
            <Button $variant="secondary" onClick={handleCancel}>
              Отмена
            </Button>
            <Button $variant="primary" onClick={handleSubmit}>
              Создать
            </Button>
          </ButtonGroup>
        </ModalContent>
      </ModalOverlay>
    </>
  );
};

export default FileCreator;
