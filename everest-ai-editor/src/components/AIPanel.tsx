import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  Trash2, 
  Loader,
  Sparkles,
  Code,
  Lightbulb,
  Bug,
  Settings,
  Zap,
  Brain,
  Pin,
  FileText,
  Eye,
  Paperclip,
  X,
  Check,
  Edit3,
  Square,
  ChevronDown,
  ChevronUp,
  Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { trackGoal, YM_EVENTS } from '../utils/yandexMetrika';
import DeveloperContactModal from './DeveloperContactModal';

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number; // Опциональный timestamp для даты отправки
}

interface AIPanelProps {
  messages: AIMessage[];
  onSendMessage: (message: string, provider?: string, abortController?: AbortController) => void;
  currentFile?: {
    name: string;
    content: string;
    language: string;
  };
  onInsertCode?: (code: string) => void;
  availableFiles?: Array<{
    name: string;
    content: string;
    language: string;
  }>;
  // Диалоги
  conversations?: Array<{ id: number; title?: string; messages?: any[] }>;
  currentConversationId?: number | null;
  onNewConversation?: () => void;
  onSelectConversation?: (id: number) => void;
  onDeleteConversation?: (id: number) => void;
  onRenameConversation?: (id: number, title: string) => void;
  onStopGeneration?: () => void;
}

const AIPanelContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.aiPanel};
  border-left: 1px solid ${props => props.theme.colors.border};
`;

const AIHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${props => props.theme.colors.surface};
`;

const AIHeaderTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: white !important;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProviderSelector = styled.div`
  display: none;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NewDialogButton = styled.button`
  padding: 6px 10px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.surface};
    border-color: ${props => props.theme.colors.primary};
  }
`;

const ConversationSelect = styled.select`
  padding: 6px 8px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 12px;
`;

const SmallIconButton = styled.button`
  width: 28px;
  height: 28px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  &:hover {
    background-color: ${props => props.theme.colors.surface};
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
  }
`;

const ProviderButton = styled.button<{ $isActive: boolean }>`
  display: none;
`;

const AIMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  /* Плавная прокрутка */
  scroll-behavior: smooth;
  
  /* Видимая полоса прокрутки */
  scrollbar-width: auto;
  scrollbar-color: ${props => props.theme.colors.textSecondary} ${props => props.theme.colors.surface};
  
  &::-webkit-scrollbar {
    width: 12px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.surface};
    border-radius: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.colors.textSecondary};
    border-radius: 6px;
    border: 2px solid ${props => props.theme.colors.surface};
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background-color: ${props => props.theme.colors.primary};
  }
`;

const Message = styled.div<{ $isUser: boolean }>`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  ${props => props.$isUser && 'flex-direction: row-reverse;'}
`;

const MessageAvatar = styled.div<{ $isUser: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.$isUser ? props.theme.colors.aiUserMessage : props.theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${props => props.$isUser ? props.theme.colors.aiUserMessageText : props.theme.colors.text};
`;

const MessageContent = styled.div<{ $isUser: boolean }>`
  max-width: ${props => props.$isUser ? '80%' : '90%'}; // Сообщения бота шире (90% вместо 80%)
  padding: 12px 16px;
  border-radius: 12px;
  background-color: ${props => props.$isUser ? props.theme.colors.aiUserMessage : props.theme.colors.aiMessage};
  color: white !important;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  position: relative;
`;

const MessageTime = styled.div<{ $isUser: boolean }>`
  font-size: 10px;
  color: ${props => props.theme.colors.textSecondary};
  opacity: 0.6;
  margin-top: 4px;
  text-align: ${props => props.$isUser ? 'right' : 'left'};
`;

const MessageActions = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  ${MessageContent}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.aiUserMessageText};
  }
`;

const AIInput = styled.div`
  padding: 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  /* Оптимизации для Opera */
  contain: layout style paint;
  will-change: auto;
`;

const InputContainer = styled.div`
  width: 100%;
  
  /* Оптимизации для Opera */
  contain: layout;
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex: 1;
  width: 100%;
`;

const BottomButtonsContainer = styled.div`
  display: flex;
  gap: 6px;
  align-items: stretch;
  width: 100%;
  flex-wrap: wrap;
  min-width: 0;
`;

const InputField = styled.textarea.withConfig({
  shouldForwardProp: (prop) => !['$isUser'].includes(prop),
})`
  flex: 1;
  min-height: 40px;
  max-height: 300px;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease, height 0.2s ease;
  
  /* Убираем полосы прокрутки */
  overflow: hidden;
  
  /* Оптимизации для Opera */
  will-change: auto;
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  /* Отключение аппаратного ускорения для текстовых полей в Opera */
  @media screen and (-webkit-min-device-pixel-ratio: 0) {
    transform: none;
    will-change: auto;
  }

  &:focus {
    border-color: ${props => props.theme.colors.primary};
    /* Убираем outline для Opera */
    outline: none !important;
    -webkit-tap-highlight-color: transparent;
  }

  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
    /* Оптимизация placeholder для Opera */
    opacity: 0.7;
  }
`;

const SendButton = styled.button<{ disabled?: boolean }>`
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background-color: ${props => props.disabled ? props.theme.colors.border : props.theme.colors.primary};
  color: ${props => props.disabled ? props.theme.colors.textSecondary : props.theme.colors.aiUserMessageText};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryHover};
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

const QuickActions = styled.div<{ $collapsed?: boolean }>`
  display: ${props => (props.$collapsed ? 'none' : 'flex')};
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const QuickActionButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.surface};
    border-color: ${props => props.theme.colors.primary};
  }
`;

const QuickActionMainButton = styled.button`
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  height: 32px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  > svg {
    flex-shrink: 0;
  }

  &:hover {
    background-color: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    color: ${props => props.theme.colors.text};
  }

  @media (max-width: 600px) {
    font-size: 10px;
    padding: 6px 6px;
    gap: 3px;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
`;

const CurrentFileCard = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.surface} 0%, ${props => props.theme.colors.background} 100%);
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.primaryHover});
    border-radius: 12px 12px 0 0;
  }
`;

const FileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const FileName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FileStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${props => props.theme.colors.primary};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const FileLanguage = styled.span`
  font-size: 10px;
  padding: 2px 6px;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.aiUserMessageText};
  border-radius: 4px;
  text-transform: uppercase;
`;

const FileContent = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textSecondary};
  background-color: ${props => props.theme.colors.background};
  border-radius: 4px;
  padding: 8px;
  max-height: 100px;
  overflow-y: auto;
  font-family: 'Monaco', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-all;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const InsertCodeButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.aiUserMessageText};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.primaryHover};
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CodeBlock = styled.div`
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  position: relative;
`;

const CodeActions = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const CodeActionButton = styled.button`
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.aiUserMessageText};
  }
`;

const AttachButton = styled.button`
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  height: 32px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  > svg {
    flex-shrink: 0;
  }

  &:hover {
    background-color: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    color: ${props => props.theme.colors.text};
  }

  @media (max-width: 600px) {
    font-size: 10px;
    padding: 6px 6px;
    gap: 3px;
  }
`;

const ModelButton = styled(AttachButton)`
  flex: 1 1 auto;
  min-width: 80px;
  max-width: 100%;
  font-weight: 600;
  justify-content: space-between;
  gap: 6px;
  
  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }
  
  > svg {
    flex-shrink: 0;
    opacity: 1 !important;
    display: block !important;
    width: 16px;
    height: 16px;
  }

  @media (max-width: 600px) {
    min-width: 60px;
    font-size: 10px;
    gap: 4px;
    
    > svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const FileSelector = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
`;

const FileOption = styled.div`
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.background};
  }
`;

const EnhancedCodeBlock = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.background} 0%, ${props => props.theme.colors.surface} 100%);
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
  font-family: 'Monaco', 'Consolas', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.primaryHover});
    border-radius: 12px 12px 0 0;
  }
`;

const CodeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const CodeTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const InsertSuggestion = styled.div`
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const InsertText = styled.div`
  font-size: 12px;
  color: #059669;
  font-weight: 500;
`;

const InsertButton = styled.button`
  background-color: #059669;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background-color: #047857;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const FormattedText = styled.div`
  word-wrap: break-word;
  line-height: 1.6;
  white-space: normal;
  
  p {
    margin: 0 0 12px 0;
    white-space: normal;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  h3 {
    font-size: 16px;
    font-weight: 700;
    margin: 20px 0 12px 0;
    color: ${props => props.theme.colors.primary};
    white-space: normal;
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 16px 0 8px 0;
    color: ${props => props.theme.colors.text};
    white-space: normal;
  }
  
  ul, ol {
    margin: 8px 0 16px 0;
    padding-left: 24px;
    white-space: normal;
    
    li {
      margin: 4px 0;
      line-height: 1.5;
      white-space: normal;
    }
  }
  
  strong {
    font-weight: 700;
    color: ${props => props.theme.colors.primary};
  }
  
  code {
    background-color: ${props => props.theme.colors.background};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.9em;
    white-space: pre;
  }
  
  hr {
    border: none;
    border-top: 1px solid ${props => props.theme.colors.border};
    margin: 16px 0;
  }
`;

// Компонент для постепенного вывода текста (эффект печатания)
interface TypingTextProps {
  text: string;
  speed?: number; // слов в минуту
  onUpdate?: (displayedText: string) => void;
  onComplete?: () => void;
  cancel?: boolean; // Флаг для принудительной остановки анимации
}

// Компонент для анимации Linux команд при загрузке
const LinuxCommandAnimation: React.FC = () => {
  const commands = [
    '$ cat /proc/cpuinfo | grep "model name"',
    '$ ps aux | grep python',
    '$ tail -f /var/log/syslog',
    '$ netstat -tuln | grep LISTEN',
    '$ df -h | grep -E "^/dev"',
    '$ top -bn1 | head -n 20',
    '$ ls -lah ~/Documents',
    '$ curl -s https://api.github.com/repos/octocat/Hello-World',
    '$ grep -r "TODO" src/',
    '$ docker ps -a',
    '$ git log --oneline -n 10',
    '$ find . -name "*.log" -mtime -7',
    '$ iostat -x 1 5',
    '$ free -mh',
    '$ ss -tuln',
    '$ journalctl -f -u nginx',
  ];
  
  const [currentCommand, setCurrentCommand] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  useEffect(() => {
    const command = commands[currentCommand];
    let index = 0;
    setIsTyping(true);
    setDisplayedText('');
    
    const typeInterval = setInterval(() => {
      if (index < command.length) {
        setDisplayedText(command.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
        
        // После завершения печатания, ждем немного и переключаемся на следующую команду
        const timeoutId = setTimeout(() => {
          setCurrentCommand((prev) => (prev + 1) % commands.length);
        }, 1500);
        
        return () => clearTimeout(timeoutId);
      }
    }, 50); // Скорость печатания
    
    return () => clearInterval(typeInterval);
  }, [currentCommand]);
  
  return (
    <span style={{ 
      fontFamily: "'Monaco', 'Consolas', 'Fira Code', monospace",
      fontSize: '11px',
      color: '#10b981',
      marginLeft: '8px'
    }}>
      {displayedText}
      {isTyping && <span style={{ opacity: 0.7 }}>▊</span>}
    </span>
  );
};

const TypingText: React.FC<TypingTextProps> = ({ text, speed = 600, onUpdate, onComplete, cancel = false }) => {
  const onUpdateRef = useRef(onUpdate);
  const onCompleteRef = useRef(onComplete);
  const textRef = useRef(text);
  const isRunningRef = useRef(false);
  const isCancelledRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onCompleteRef.current = onComplete;
  }, [onUpdate, onComplete]);
  
  // Реагируем на cancel prop - немедленно останавливаем анимацию
  useEffect(() => {
    if (cancel) {
      isCancelledRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      isRunningRef.current = false;
    }
  }, [cancel]);
  
  useEffect(() => {
    if (cancel) {
      // Если отменено, не запускаем анимацию
      return;
    }
    if (textRef.current === text && isRunningRef.current) {
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    textRef.current = text;
    isCancelledRef.current = false;
    if (!text) {
      if (onUpdateRef.current) onUpdateRef.current('');
      if (onCompleteRef.current) onCompleteRef.current();
      isRunningRef.current = false;
      return;
    }
    isRunningRef.current = true;

    // Печать "по слогам": группами по 3-5 символов, с сохранением общей скорости в 600 wpm
    // 600 WPM = 600 слов/мин = 10 слов/сек
    // Среднее слово ~5 символов, значит 50 символов/сек
    // chunkSize = 3-5 символов для более плавной печати
    const avgCharsPerWord = 5; // типичное среднее для расчёта темпа
    const wordsPerMinute = speed || 600;
    const charsPerSecond = (wordsPerMinute * avgCharsPerWord) / 60; // символов в секунду
    
    // Используем фиксированный chunkSize = 4 для более плавной и быстрой печати
    // 4 символа дают более естественный ритм печати
    const chunkSize = 4;
    
    // Расчет delay: chunkSize символов должны выводиться за (chunkSize / charsPerSecond) секунд
    // Для 600 WPM: (chunkSize / 50) * 1000 = chunkSize * 20 мс
    const delay = Math.max(16, Math.round((chunkSize / charsPerSecond) * 1000));

    let currentIndex = 0;
    let currentText = '';
    
    // Немедленно инициализируем пустую строку, чтобы предотвратить мелькание полного текста
    if (onUpdateRef.current && !isCancelledRef.current) {
      onUpdateRef.current('');
    }

    timerRef.current = setInterval(() => {
      if (isCancelledRef.current || currentIndex >= text.length) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        isRunningRef.current = false;
        if (!isCancelledRef.current && onCompleteRef.current) onCompleteRef.current();
        return;
      }
      const nextIndex = Math.min(text.length, currentIndex + chunkSize);
      currentText += text.slice(currentIndex, nextIndex);
      if (onUpdateRef.current && !isCancelledRef.current) {
        onUpdateRef.current(currentText);
      }
      currentIndex = nextIndex;
    }, delay);

    return () => {
      isCancelledRef.current = true;
      isRunningRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, speed, cancel]);
  
  return null;
};

// Функция для определения языка кода из текста блока кода
const detectCodeLanguage = (code: string, context?: string): string => {
  // Если есть контекст с языком (например, ```python)
  if (context) {
    const langMatch = context.match(/```(\w+)/);
    if (langMatch) {
      return langMatch[1];
    }
  }
  
  // Простая эвристика для определения языка
  const trimmedCode = code.trim().toLowerCase();
  
  // C/C++
  if (code.includes('#include') || code.includes('std::') || code.includes('using namespace') || 
      code.includes('int main') || code.includes('void main') || code.includes('#define')) {
    return 'cpp';
  }
  
  // Python
  if (code.includes('def ') || code.includes('import ') || code.includes('print(') || 
      code.includes('from ') || code.includes('class ') || code.includes('if __name__')) {
    return 'python';
  }
  
  // JavaScript/TypeScript
  if (code.includes('function ') || code.includes('const ') || code.includes('let ') || 
      code.includes('=>') || code.includes('document.') || code.includes('console.log') ||
      code.includes('export ') || code.includes('require(') || code.includes('import ')) {
    return 'javascript';
  }
  
  // Java
  if (code.includes('public class') || code.includes('import java') || 
      code.includes('@Override') || code.includes('package ')) {
    return 'java';
  }
  
  // PHP
  if (code.includes('<?php') || (code.includes('$') && code.includes('function'))) {
    return 'php';
  }
  
  // HTML
  if (code.includes('<!DOCTYPE') || code.includes('<html') || code.includes('<div') ||
      (code.includes('<') && code.includes('>'))) {
    return 'html';
  }
  
  // CSS
  if (code.includes('{') && code.includes('}') && 
      (code.includes(':') || code.includes('#') || code.includes('@media'))) {
    return 'css';
  }
  
  // Bash/Shell
  if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh') || 
      code.includes('echo ') || code.includes('cd ') || code.includes('sudo ')) {
    return 'bash';
  }
  
  // SQL
  if (code.includes('SELECT ') || code.includes('FROM ') || code.includes('INSERT INTO') ||
      code.includes('CREATE TABLE') || code.includes('WHERE ')) {
    return 'sql';
  }
  
  // Ruby
  if (code.includes('def ') && code.includes('end') || code.includes('puts ') || code.includes('require ')) {
    return 'ruby';
  }
  
  // Go
  if (code.includes('package main') || code.includes('func main()') || code.includes('import (')) {
    return 'go';
  }
  
  // Rust
  if (code.includes('fn main()') || code.includes('use std::') || code.includes('let mut ')) {
    return 'rust';
  }
  
  // Swift
  if (code.includes('func ') && code.includes('->') || code.includes('import Swift') || code.includes('@State')) {
    return 'swift';
  }
  
  // Kotlin
  if (code.includes('fun main()') || code.includes('val ') || code.includes('class ') && code.includes(':')) {
    return 'kotlin';
  }
  
  // C#
  if (code.includes('using System') || code.includes('namespace ') || code.includes('public static')) {
    return 'csharp';
  }
  
  // JSON
  if (code.trim().startsWith('{') && code.trim().endsWith('}') || 
      code.trim().startsWith('[') && code.trim().endsWith(']')) {
    return 'json';
  }
  
  // Markdown
  if (code.includes('# ') || code.includes('## ') || code.includes('*') || code.includes('```')) {
    return 'markdown';
  }
  
  // Dockerfile
  if (code.includes('FROM ') || code.includes('RUN ') || code.includes('CMD ') || code.includes('COPY ')) {
    return 'dockerfile';
  }
  
  return 'text';
};

// Стилизованный контейнер для блока кода
const CodeBlockContainer = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.background} 0%, ${props => props.theme.colors.surface} 100%);
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
  font-family: 'Monaco', 'Consolas', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.primaryHover});
    border-radius: 12px 12px 0 0;
  }
  
  /* Переопределяем стили SyntaxHighlighter */
  .react-syntax-highlighter {
    margin: 0 !important;
    padding: 0 !important;
    font-size: 13px !important;
    line-height: 1.5 !important;
    
    pre {
      margin: 0 !important;
      padding: 0 !important;
    }
  }
`;

// Компонент для блока кода с подсветкой синтаксиса
const CodeBlockWithHighlight: React.FC<{ 
  code: string; 
  language?: string;
  onInsertCode?: (code: string) => void;
  currentFile?: { name: string; content: string; language: string };
}> = ({ code, language, onInsertCode, currentFile }) => {
  const detectedLang = language || detectCodeLanguage(code);
  
  return (
    <CodeBlockContainer>
      {(onInsertCode && currentFile) && (
        <CodeHeader>
          <CodeTitle>
            <Code size={12} />
            Код для вставки
          </CodeTitle>
          <CodeActions>
            <InsertButton 
              onClick={() => onInsertCode(code)}
              style={{ marginRight: '4px' }}
            >
              <Check size={12} />
              Вставить
            </InsertButton>
            <CodeActionButton 
              onClick={() => navigator.clipboard.writeText(code)} 
              title="Копировать код"
            >
              <Copy size={10} />
            </CodeActionButton>
          </CodeActions>
        </CodeHeader>
      )}
      <SyntaxHighlighter
        language={detectedLang}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '8px',
          fontSize: '13px',
          lineHeight: '1.5',
        }}
        PreTag="div"
        codeTagProps={{
          style: {
            fontFamily: "'Monaco', 'Consolas', 'Fira Code', monospace",
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </CodeBlockContainer>
  );
};

// Функция для форматирования текста с markdown-подобным синтаксисом и подсветкой кода
const formatMessageText = (
  text: string, 
  isTyping: boolean = false, 
  displayedText: string = '',
  onInsertCode?: (code: string) => void,
  currentFile?: { name: string; content: string; language: string }
): React.ReactNode => {
  if (!text || text.trim() === '') {
    return text;
  }
  
  // Используем displayedText если идет печатание, но проверяем полный текст для определения блоков кода
  const textToFormat = isTyping && displayedText ? displayedText : text;
  const fullText = text; // Полный текст для проверки завершенности блоков
  
  // Сначала извлекаем блоки кода (```...```) из полного текста
  // Это нужно, чтобы знать, какие блоки кода должны быть, даже если они еще не напечатаны
  // Улучшенное регулярное выражение: поддерживает язык, опциональный перенос строки и многострочный код
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const fullMatches: Array<{ start: number; end: number; language?: string; content: string }> = [];
  let match;
  
  // Сбрасываем индекс регулярного выражения
  codeBlockRegex.lastIndex = 0;
  
  while ((match = codeBlockRegex.exec(fullText)) !== null) {
    const language = match[1] ? match[1].trim() : undefined;
    const content = match[2].trim();
    
    // Пропускаем пустые блоки кода
    if (!content) continue;
    
    fullMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      language,
      content
    });
  }
  
  // Сортируем блоки по позиции начала (на случай, если регулярное выражение вернуло их в неправильном порядке)
  fullMatches.sort((a, b) => a.start - b.start);
  
  // Теперь обрабатываем textToFormat с учетом полных блоков кода
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  let lastIndex = 0;
  
  // Обрабатываем каждый полный блок кода
  fullMatches.forEach((codeMatch, matchIndex) => {
    // Добавляем текст до блока кода (из textToFormat), если он есть
    const textBeforeEnd = Math.min(codeMatch.start, textToFormat.length);
    if (textBeforeEnd > lastIndex) {
      const textBefore = textToFormat.slice(lastIndex, textBeforeEnd);
      if (textBefore.trim() || textBefore.includes('\n')) {
        parts.push({ type: 'text', content: textBefore });
      }
      lastIndex = textBeforeEnd;
    }
    
    // Блок кода показываем мгновенно, как только начали печатать блок кода
    // Проверяем, начали ли мы печатать блок кода:
    // 1. textToFormat уже достиг начала блока (start)
    // 2. И в этой позиции точно начинается ``` (проверяем, что первые 3 символа в позиции start это ```)
    const hasReachedStart = textToFormat.length >= codeMatch.start;
    let hasStartedCodeBlock = false;
    
    if (hasReachedStart) {
      // Проверяем, что в позиции start начинается ```
      const startPos = codeMatch.start;
      const startSlice = textToFormat.slice(startPos, Math.min(startPos + 3, textToFormat.length));
      
      // Если мы уже начали печатать ``` (хотя бы первые 2 символа)
      // Или если полностью напечатали ```
      hasStartedCodeBlock = startSlice === '```' || 
                           (startSlice.length >= 2 && startSlice[0] === '`' && startSlice[1] === '`');
    }
    
    // Если начали печатать блок кода, показываем его целиком (мгновенно)
    if (hasStartedCodeBlock) {
      // Блок кода должен быть показан - показываем его с подсветкой из полного текста
      const language = codeMatch.language || detectCodeLanguage(codeMatch.content);
      parts.push({ type: 'code', content: codeMatch.content, language });
      // Важно: обновляем lastIndex до конца блока, чтобы правильно обработать следующий блок
      lastIndex = Math.max(lastIndex, codeMatch.end);
    } else {
      // Если блок еще не начал печататься, обновляем lastIndex только до текущей позиции textToFormat
      // Это нужно, чтобы не пропустить текст между блоками
      if (textToFormat.length < codeMatch.start) {
        // Текст еще не дошел до начала блока - останавливаем обработку
        lastIndex = textToFormat.length;
      }
      // Если текст уже прошел начало, но блок не начался (что странно), обновляем до начала блока
      else if (textToFormat.length >= codeMatch.start && !hasStartedCodeBlock) {
        // Это может произойти, если блок кода пропущен или не распознан
        // Обновляем lastIndex до начала следующего потенциального блока
        lastIndex = Math.max(lastIndex, codeMatch.start);
      }
    }
  });
  
  // Добавляем оставшийся текст после всех блоков кода
  // Но только если мы действительно прошли все блоки кода
  if (lastIndex < textToFormat.length) {
    const remainingText = textToFormat.slice(lastIndex);
    // Проверяем, не начинается ли остаток с незавершенного блока кода
    // Если начинается с ```, но блок кода еще не распознан как полный, не добавляем его как текст
    const trimmedRemaining = remainingText.trim();
    if (trimmedRemaining && !trimmedRemaining.startsWith('```')) {
      parts.push({ type: 'text', content: remainingText });
    } else if (trimmedRemaining && trimmedRemaining.startsWith('```')) {
      // Начало блока кода еще не распознано - добавляем только то, что явно не является началом блока
      const beforeBackticks = remainingText.split('```')[0];
      if (beforeBackticks.trim()) {
        parts.push({ type: 'text', content: beforeBackticks });
      }
    } else if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  // Если нет блоков кода, обрабатываем весь текст как обычный
  if (parts.length === 0) {
    parts.push({ type: 'text', content: textToFormat });
  }
  
  // Форматируем каждую часть
  const result: React.ReactNode[] = [];
  
  parts.forEach((part, partIndex) => {
    if (part.type === 'code') {
      // Блок кода с подсветкой синтаксиса
      result.push(
        <CodeBlockWithHighlight 
          key={`code-${partIndex}`} 
          code={part.content} 
          language={part.language}
          onInsertCode={onInsertCode}
          currentFile={currentFile}
        />
      );
    } else {
      // Обычный текст
      const processedText = part.content;
      
      // Сначала обрабатываем нумерованные списки (1., 2., 3., ...)
      // Исправляем случаи, когда цифра стоит в конце строки: "текст. 1. элемент" -> "текст.\n1. элемент"
      let textWithHeadings = processedText.replace(/([.!?])\s+(\d+\.\s+[^\n]+)/g, '$1\n\n$2');
      
      // Обрабатываем нумерованные списки, которые идут подряд: "1. один 2. два" -> "1. один\n2. два"
      textWithHeadings = textWithHeadings.replace(/(\d+\.\s+[^\n]+?)(?=\s+\d+\.)/g, '$1\n');
      
      // Разбиваем по заголовкам ###
      textWithHeadings = textWithHeadings.replace(/([^\n])\s*(###+)\s+([^\n]+?)(?=\s*###|\s*[-*]|\s*---|$)/g, '$1\n$2 $3');
      
      // Разбиваем по элементам списка с маркерами (- или *)
      textWithHeadings = textWithHeadings.replace(/([^\n])\s*[-*]\s+([^\n]+?)(?=\s*###|\s*[-*]|\s*---|$)/g, '$1\n- $2');
      
      // Разбиваем на абзацы (но не внутри списков)
      // Избегаем разбиения если после точки идет цифра (это может быть продолжением списка)
      textWithHeadings = textWithHeadings.replace(/([.!?])\s+([А-ЯA-Z])(?![^\n]*\d+\.)/g, '$1\n\n$2');
      
      const lines = textWithHeadings.split('\n');
      // Нормализуем списки: случаи, когда номер/маркер на отдельной строке, а текст ниже
      const normalizedLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const trimmed = raw.trim();
        // Совпадение для нумерованного пункта вида: "1." или "12." без текста
        const isBareOrdered = /^\d+\.\s*$/.test(trimmed);
        // Совпадение для маркированного пункта вида: "-" или "*" без текста
        const isBareBullet = /^[-*]\s*$/.test(trimmed);
        if (isBareOrdered || isBareBullet) {
          // Ищем следующую непустую строку как содержимое пункта
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j++;
          if (j < lines.length) {
            const marker = isBareOrdered ? trimmed.replace(/\.$/, '. ') : (trimmed.startsWith('-') ? '- ' : '* ');
            const combined = marker + lines[j].trim();
            normalizedLines.push(combined);
            i = j; // пропускаем использованные пустые строки и строку с текстом
            continue;
          }
          // Если текста нет, просто добавляем исходную строку
          normalizedLines.push(raw);
          continue;
        }
        normalizedLines.push(raw);
      }
      const elements: React.ReactNode[] = [];
      let currentParagraph: string[] = [];
      let currentList: string[] = [];
      let currentOrderedList: string[] = [];
      
      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          const paragraphText = currentParagraph.join(' ').trim();
          if (paragraphText) {
            const formatted = paragraphText
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/`(.+?)`/g, '<code>$1</code>');
            elements.push(
              <p key={elements.length} dangerouslySetInnerHTML={{ __html: formatted }} />
            );
          }
          currentParagraph = [];
        }
      };
      
      const flushList = () => {
        if (currentList.length > 0) {
          const listItems = currentList.map((item, idx) => {
            const formatted = item
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/`(.+?)`/g, '<code>$1</code>');
            return (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />
            );
          });
          elements.push(<ul key={elements.length}>{listItems}</ul>);
          currentList = [];
        }
      };
      
      const flushOrderedList = () => {
        if (currentOrderedList.length > 0) {
          const listItems = currentOrderedList.map((item, idx) => {
            // Убираем номер из начала элемента (1. текст -> текст)
            const cleanedItem = item.replace(/^\d+\.\s*/, '').trim();
            const formatted = cleanedItem
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/`(.+?)`/g, '<code>$1</code>');
            return (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />
            );
          });
          elements.push(<ol key={elements.length}>{listItems}</ol>);
          currentOrderedList = [];
        }
      };
      
      normalizedLines.forEach((line) => {
        const trimmed = line.trim();
        
        if (trimmed.match(/^###+\s/)) {
          flushOrderedList();
          flushList();
          flushParagraph();
          const headingText = trimmed.replace(/^###+\s+/, '').trim();
          if (headingText) {
            elements.push(<h3 key={elements.length}>{headingText}</h3>);
          }
          return;
        }
        
        if (trimmed.match(/^####+\s/)) {
          flushOrderedList();
          flushList();
          flushParagraph();
          const headingText = trimmed.replace(/^####+\s+/, '').trim();
          if (headingText) {
            elements.push(<h4 key={elements.length}>{headingText}</h4>);
          }
          return;
        }
        
        if (trimmed.match(/^---+$/)) {
          flushOrderedList();
          flushList();
          flushParagraph();
          elements.push(<hr key={elements.length} />);
          return;
        }
        
        if (trimmed === '') {
          flushOrderedList();
          flushList();
          flushParagraph();
          return;
        }
        
        // Обрабатываем нумерованные списки (1., 2., 3., ...)
        if (trimmed.match(/^\d+\.\s/)) {
          flushList(); // Маркированные списки прерывают нумерованные и наоборот
          flushParagraph();
          currentOrderedList.push(trimmed);
          return;
        }
        
        // Обрабатываем маркированные списки (- или *)
        if (trimmed.match(/^[-*]\s/)) {
          flushOrderedList(); // Нумерованные списки прерывают маркированные
          flushParagraph();
          const listItem = trimmed.replace(/^[-*]\s+/, '').trim();
          if (listItem) {
            currentList.push(listItem);
          }
          return;
        }
        
        // Если текущая строка не является элементом списка, закрываем все списки
        flushOrderedList();
        flushList();
        currentParagraph.push(trimmed);
      });
      
      flushOrderedList();
      flushList();
      flushParagraph();
      
      if (elements.length === 0 && processedText.trim()) {
        const formatted = processedText
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.+?)`/g, '<code>$1</code>');
        elements.push(<p key={0} dangerouslySetInnerHTML={{ __html: formatted }} />);
      }
      
      result.push(...elements.map((el, idx) => React.cloneElement(el as React.ReactElement, { key: `text-${partIndex}-${idx}` })));
    }
  });
  
  return result.length > 0 ? result : text;
};

// Функция для форматирования даты и времени сообщения
const formatMessageTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  // Если меньше минуты - показываем "только что"
  if (diffMins < 1) {
    return 'только что';
  }
  
  // Если меньше часа - показываем минуты
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'минуту' : diffMins < 5 ? 'минуты' : 'минут'} назад`;
  }
  
  // Если меньше суток - показываем часы
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`;
  }
  
  // Если меньше недели - показываем дни
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'} назад`;
  }
  
  // Иначе показываем полную дату и время
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const AIPanel: React.FC<AIPanelProps> = ({ messages, onSendMessage, currentFile, onInsertCode, availableFiles = [], conversations = [], currentConversationId = null, onNewConversation, onSelectConversation, onDeleteConversation, onRenameConversation, onStopGeneration }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gigachat' | 'chatgpt'>('gigachat');
  const [attachedFiles, setAttachedFiles] = useState<Array<{name: string, content: string, language: string}>>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showDeveloperContact, setShowDeveloperContact] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'GigaChat Lite' | 'GigaChat Pro' | 'GigaChat Max'>('GigaChat Lite');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const [modelMenuCoords, setModelMenuCoords] = useState<{left: number, top: number, width: number, height: number} | null>(null);
  const [fileMenuCoords, setFileMenuCoords] = useState<{left: number, top: number, width: number, height: number} | null>(null);
  const { isAuthenticated, isPremium } = useAuth();
  
  // Состояние для эффекта печатания - отслеживаем какие сообщения печатаются
  const [typingMessages, setTypingMessages] = useState<Map<number, string>>(new Map());
  const [completedTyping, setCompletedTyping] = useState<Set<number>>(new Set());
  
  // Состояние для отслеживания процесса генерации ответа ИИ
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopTypingRef = useRef<Set<number>>(new Set()); // Индексы сообщений, которые нужно остановить
  const hasInitializedRef = useRef(false); // Флаг первой инициализации
  const [autoFollow, setAutoFollow] = useState(true);
  const [autoFollowLocked, setAutoFollowLocked] = useState(false);
  const autoFollowRef = useRef<boolean>(true);
  useEffect(() => { autoFollowRef.current = autoFollow; }, [autoFollow]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 40; // px
    return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const nearBottom = isNearBottom();
    // Если пользователь листает вверх во время ответа — перестаем авто‑следовать до окончания ответа
    if (isGenerating) {
      if (!nearBottom) {
        setAutoFollow(false);
        setAutoFollowLocked(true);
      } else if (!autoFollowLocked) {
        setAutoFollow(true);
      }
    } else {
      // В режиме без генерации просто помечаем, у низа ли мы
      if (!nearBottom) setAutoFollow(false); else setAutoFollow(true);
    }
  }, [isGenerating, autoFollowLocked, isNearBottom]);

  // Инициализация при первой загрузке - помечаем все сообщения как завершенные
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (messages.length === 0) return;
    
    // Помечаем все существующие сообщения как завершенные при первой загрузке
    const initialCompleted = new Set<number>();
    messages.forEach((_, index) => {
      initialCompleted.add(index);
    });
    setCompletedTyping(initialCompleted);
    hasInitializedRef.current = true;
  }, [messages.length]); // Запускаем только при изменении количества сообщений
  
  // Отслеживаем новые сообщения от assistant и запускаем эффект печатания
  // Используем useLayoutEffect для СИНХРОННОЙ инициализации до рендера
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    
    // Проверяем последнее сообщение - это обычно новое сообщение от assistant
    const lastIndex = messages.length - 1;
    const lastMessage = messages[lastIndex];
    
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
      // СИНХРОННО инициализируем пустую строку в typingMessages для нового сообщения
      // Это предотвращает мелькание полного текста при первом рендере
      setTypingMessages(prev => {
        const newMap = new Map(prev);
        // Инициализируем только если этого индекса еще нет в карте
        if (!newMap.has(lastIndex)) {
          newMap.set(lastIndex, '');
        }
        return newMap;
      });
      
      // Убираем индикатор загрузки, когда пришел ответ (начало печатания)
      setIsLoading(prev => prev ? false : prev);
    }
  }, [messages]); // Отслеживаем изменения сообщений

  // Отслеживаем процесс генерации ответа ИИ
  useEffect(() => {
    if (messages.length === 0) {
      setIsGenerating(false);
      return;
    }
    
    // Проверяем последнее сообщение от assistant
    const lastIndex = messages.length - 1;
    const lastMessage = messages[lastIndex];
    
    if (lastMessage && lastMessage.role === 'assistant') {
      // Проверяем, печатается ли это сообщение
      const isTyping = !completedTyping.has(lastIndex);
      
      if (isTyping) {
        // ИИ начал отвечать или еще отвечает
        setIsGenerating(true);
      } else {
        // ИИ закончил отвечать
        setIsGenerating(false);
      }
    } else {
      // Последнее сообщение от пользователя - генерация не идет
      setIsGenerating(false);
    }
  }, [messages, completedTyping]); // Используем messages целиком, но это лучше чем зацикливание

  // Прокрутка при изменении сообщений или во время печатания
  useEffect(() => {
    if (autoFollow) scrollToBottom();
  }, [messages.length]); // Прокручиваем только при изменении количества сообщений

  // Старт/завершение генерации — включаем/снимаем блокировку авто‑следования
  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    if (isGenerating && !wasGeneratingRef.current) {
      // Бот начал печатать: уходим в конец и включаем авто‑следование
      setAutoFollow(true);
      scrollToBottom();
    }
    if (!isGenerating && wasGeneratingRef.current) {
      // Бот закончил — снимаем блокировку
      setAutoFollowLocked(false);
    }
    wasGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Убрали useEffect для изменения высоты - теперь это делается напрямую в handleInputChange
  // Это предотвращает лишние re-render и лаги при вводе

  const handleSend = useCallback(async () => {
    // Читаем значение напрямую из textarea (неконтролируемый компонент)
    const currentValue = inputRef.current?.value || inputValueRef.current || '';
    if (!currentValue.trim() || isLoading || isGenerating) return;

    const message = currentValue.trim();
    
    // Очищаем textarea напрямую
    if (inputRef.current) {
      inputRef.current.value = '';
      inputValueRef.current = '';
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = '40px'; // Устанавливаем минимальную высоту
    }
    // Обновляем состояние кнопки (disabled)
    setButtonDisabled(true);
    setIsLoading(true);
    
    // Создаем новый AbortController для возможности прерывания запроса
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Проверяем, если выбрана модель GigaChat Max - показываем сообщение о подписке
    if (selectedModel === 'GigaChat Max') {
      trackGoal && trackGoal(YM_EVENTS.AI_GIGACHAT_MAX_ATTEMPT); // Фиксация попытки Max
      const subscriptionMessage = '🚀 **GigaChat Max** доступен только для пользователей с **Premium подпиской**.\n\nПодписка в активной разработке и будет доступна в ближайшее время.\n\nЕсли у вас есть вопросы или предложения, пишите в Telegram: @EverestAlpine';
      
      // Добавляем сообщение от AI о подписке
      setTimeout(() => {
        onSendMessage(subscriptionMessage, 'assistant:subscription', abortController);
        setIsLoading(false);
        abortControllerRef.current = null;
      }, 300);
      return;
    }

    try {
      // Маппинг уровня модели на название модели GigaChat (@https://developers.sber.ru/docs/ru/gigachat/guides/selecting-a-model)
      trackGoal && trackGoal(YM_EVENTS.AI_ASSISTANT_USE); // Фиксация использования AI
      
      // Отслеживание первого запроса AI (если это первый запрос пользователя)
      const userMessages = messages.filter(msg => msg.role === 'user');
      if (userMessages.length === 0) {
        trackGoal && trackGoal(YM_EVENTS.AI_FIRST_REQUEST); // Первый запрос к AI
      }
      
      // Отслеживание попытки использовать GigaChat Pro
      if (selectedModel === 'GigaChat Pro') {
        trackGoal && trackGoal(YM_EVENTS.AI_GIGACHAT_PRO_ATTEMPT); // Попытка использовать GigaChat Pro
      }
      
      const modelMap: Record<string, string> = {
        'GigaChat Lite': 'GigaChat-2',
        'GigaChat Pro': 'GigaChat-2-Pro',
        'GigaChat Max': 'GigaChat-2-Max',
      };
      const modelName = modelMap[selectedModel] || 'GigaChat-2-Pro';
      onSendMessage(message, selectedProvider + ':' + modelName, abortController);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, isGenerating, selectedModel, selectedProvider, onSendMessage]);

  const wasManuallyStoppedRef = useRef(false);
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsLoading(false);
    wasManuallyStoppedRef.current = true;
    if (onStopGeneration) {
      onStopGeneration();
    }
    if (messages.length > 0) {
      const lastIndex = messages.length - 1;
      const lastMessage = messages[lastIndex];
      if (lastMessage && lastMessage.role === 'assistant') {
        stopTypingRef.current.add(lastIndex);
        // Сохраняем текущий текст из typingMessages - это то, что было напечатано до остановки
        setTypingMessages(prev => {
          const newMap = new Map(prev);
          const currentDisplayedText = newMap.get(lastIndex);
          // Если текста нет в typingMessages, значит печатание еще не началось
          // В этом случае сохраняем пустую строку (или можно оставить как есть)
          if (currentDisplayedText === undefined) {
            // Если печатание еще не началось, сохраняем пустую строку
            newMap.set(lastIndex, '');
          }
          // Если текст есть - сохраняем его (он уже содержит напечатанную часть)
          // Не заменяем на полный message.content!
          return newMap;
        });
        setCompletedTyping(prev => new Set(prev).add(lastIndex));
      }
    }
  }, [messages, onStopGeneration]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Обработка специальных комбинаций клавиш
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating) {
        // Если идет генерация, останавливаем её
        handleStop();
      } else {
        // Иначе отправляем сообщение
        handleSend();
      }
    } else if (e.key === 'a' && e.ctrlKey) {
      // Ctrl+A - выделить весь текст
      // Не предотвращаем стандартное поведение
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // При удалении текста также обновляем высоту
      setTimeout(() => {
        if (inputRef.current) {
          const textarea = inputRef.current;
          const minHeight = 40;
          const maxHeight = 300;
          
          textarea.style.height = 'auto';
          const scrollHeight = textarea.scrollHeight;
          const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
          textarea.style.height = newHeight + 'px';
        }
      }, 0);
    }
  }, [handleSend, isGenerating, handleStop]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // После вставки текста обновляем высоту
    setTimeout(() => {
      if (inputRef.current) {
        const textarea = inputRef.current;
        const minHeight = 40;
        const maxHeight = 300;
        
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
        textarea.style.height = newHeight + 'px';
      }
    }, 0);
  }, []);

  // Используем ref для немедленного доступа без re-render
  // inputValue state больше не используется - textarea теперь uncontrolled
  const inputValueRef = useRef<string>('');
  const [buttonDisabled, setButtonDisabled] = useState(true);
  
  // Вспомогательная функция для обновления textarea без re-render всего компонента
  const updateTextareaValue = useCallback((value: string) => {
    if (inputRef.current) {
      inputRef.current.value = value;
      inputValueRef.current = value;
      
      // Обновляем высоту
      const minHeight = 40;
      const maxHeight = 300;
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      inputRef.current.style.height = newHeight + 'px';
    }
    // Обновляем только состояние для disabled кнопки
    setButtonDisabled(!value.trim());
  }, []);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Сохраняем в ref для немедленного доступа (без re-render)
    inputValueRef.current = value;
    
    // Обновляем высоту textarea синхронно (это быстрая операция)
    const textarea = e.target;
    const minHeight = 40;
    const maxHeight = 300;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
    textarea.style.height = newHeight + 'px';
    
    // Обновляем только состояние для disabled кнопки (не inputValue!)
    // Это не вызывает перерисовку всего компонента, только кнопки
    setButtonDisabled(!value.trim());
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQuickAction = (action: string) => {
    const actions = {
      'explain': 'Объясни этот код:',
      'optimize': 'Оптимизируй этот код:',
      'debug': 'Найди ошибки в этом коде:',
      'refactor': 'Рефактори этот код:'
    };
    
    const value = actions[action as keyof typeof actions] || '';
    updateTextareaValue(value);
    inputRef.current?.focus();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const extractCodeFromMessage = (content: string): string | null => {
    // Ищем код в блоках ``` или в сообщениях
    const codeBlockMatch = content.match(/```[\s\S]*?```/g);
    if (codeBlockMatch) {
      return codeBlockMatch[0].replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
    }
    
    // Если нет блоков кода, но есть код в сообщении
    if (content.includes('#include') || content.includes('int main') || content.includes('function') || content.includes('class')) {
      return content;
    }
    
    return null;
  };

  const extractCodeLanguage = (content: string): string | undefined => {
    // Ищем язык в блоке кода ```language
    const codeBlockMatch = content.match(/```(\w+)\n?[\s\S]*?```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].toLowerCase();
    }
    
    // Если язык не указан, используем автоопределение из кода
    const extractedCode = extractCodeFromMessage(content);
    if (extractedCode) {
      return detectCodeLanguage(extractedCode);
    }
    
    return undefined;
  };

  const handleInsertCode = (code: string) => {
    if (onInsertCode) {
      onInsertCode(code);
    }
  };

  const handleContextualMessage = (action: string) => {
    if (!currentFile) {
      updateTextareaValue(`${action} код:`);
      return;
    }

    // Создаем контекстное сообщение с упоминанием файла
    const contextualMessage = `${action} код в файле ${currentFile.name} (${currentFile.language}):\n\n\`\`\`${currentFile.language}\n${currentFile.content}\n\`\`\`\n\nПожалуйста, предложи улучшения и покажи, как можно дополнить этот код.`;
    updateTextareaValue(contextualMessage);
    inputRef.current?.focus();
  };

  const handleGenerateCode = () => {
    if (!currentFile && attachedFiles.length === 0) {
      updateTextareaValue('Напиши код для:');
      return;
    }

    let contextMessage = '';
    if (currentFile) {
      contextMessage += `На основе файла ${currentFile.name} (${currentFile.language}), который содержит:\n\n\`\`\`${currentFile.language}\n${currentFile.content}\n\`\`\`\n\n`;
    }
    
    if (attachedFiles.length > 0) {
      contextMessage += 'Дополнительно прикреплены файлы:\n';
      attachedFiles.forEach(file => {
        contextMessage += `\n**${file.name}** (${file.language}):\n\`\`\`${file.language}\n${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}\n\`\`\`\n`;
      });
    }

    const generateMessage = `${contextMessage}Предложи полную реализацию или дополнения к этому коду. Покажи готовый код для вставки в файл.`;
    updateTextareaValue(generateMessage);
    inputRef.current?.focus();
  };

  const handleAttachFile = (file: {name: string, content: string, language: string}) => {
    if (!attachedFiles.find(f => f.name === file.name)) {
      setAttachedFiles(prev => [...prev, file]);
    }
    setShowFileSelector(false);
  };

  const handleRemoveAttachedFile = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const getLanguageIcon = (language: string) => {
    const icons: {[key: string]: string} = {
      'javascript': '🟨',
      'typescript': '🔷',
      'python': '🐍',
      'java': '☕',
      'cpp': '⚡',
      'c': '⚡',
      'csharp': '🔷',
      'php': '🐘',
      'ruby': '💎',
      'go': '🐹',
      'rust': '🦀',
      'swift': '🦉',
      'kotlin': '🟣',
      'scala': '🔴',
      'haskell': '🟣',
      'clojure': '🟢',
      'erlang': '🟠',
      'elixir': '💜',
      'fsharp': '🔷',
      'ocaml': '🟠',
      'lisp': '🟢',
      'prolog': '🔵',
      'fortran': '🔵',
      'cobol': '🔵',
      'pascal': '🔵',
      'ada': '🔵',
      'assembly': '⚙️',
      'bash': '🐚',
      'powershell': '💙',
      'sql': '🗃️',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'sass': '🎨',
      'less': '🎨',
      'json': '📄',
      'xml': '📄',
      'yaml': '📄',
      'toml': '📄',
      'ini': '📄',
      'markdown': '📝',
      'dockerfile': '🐳',
      'makefile': '🔧',
      'cmake': '🔧',
      'gradle': '🔧',
      'maven': '🔧',
      'ant': '🔧',
      'rake': '🔧',
      'gulp': '🔧',
      'webpack': '🔧',
      'rollup': '🔧',
      'vite': '🔧',
      'esbuild': '🔧',
      'swc': '🔧',
      'babel': '🔧',
      'prettier': '🔧',
      'eslint': '🔧',
      'stylelint': '🔧',
      'husky': '🔧',
      'lint-staged': '🔧',
      'commitizen': '🔧',
      'conventional-changelog': '🔧',
      'semantic-release': '🔧',
      'renovate': '🔧',
      'dependabot': '🔧',
      'github-actions': '🔧',
      'gitlab-ci': '🔧',
      'jenkins': '🔧',
      'travis': '🔧',
      'circleci': '🔧',
      'azure-pipelines': '🔧',
      'aws-codebuild': '🔧',
      'terraform': '🏗️',
      'ansible': '🔧',
      'puppet': '🔧',
      'chef': '🔧',
      'salt': '🔧',
      'vagrant': '🔧',
      'kubernetes': '☸️',
      'helm': '⚓',
      'istio': '🔷',
      'linkerd': '🔷',
      'consul': '🔷',
      'vault': '🔷',
      'nomad': '🔷',
      'prometheus': '📊',
      'grafana': '📊',
      'elasticsearch': '🔍',
      'kibana': '🔍',
      'logstash': '🔍',
      'beats': '🔍',
      'redis': '🔴',
      'mongodb': '🍃',
      'postgresql': '🐘',
      'mysql': '🐬',
      'sqlite': '🗃️',
      'cassandra': '🗃️',
      'neo4j': '🕸️',
      'influxdb': '📊',
      'timescaledb': '📊',
      'clickhouse': '📊',
      'bigquery': '📊',
      'snowflake': '❄️',
      'redshift': '🔴',
      'dynamodb': '⚡',
      's3': '🪣',
      'cloudfront': '☁️',
      'lambda': 'λ',
      'api-gateway': '🌐',
      'ec2': '🖥️',
      'ecs': '🐳',
      'eks': '☸️',
      'fargate': '🐳',
      'rds': '🗃️',
      'aurora': '🗃️',
      'elasticache': '🔴',
      'cloudwatch': '📊',
      'x-ray': '📊',
      'cloudtrail': '📊',
      'config': '📊',
      'guardduty': '🛡️',
      'waf': '🛡️',
      'shield': '🛡️',
      'inspector': '🔍',
      'security-hub': '🛡️',
      'macie': '🔍',
      'kms': '🔐',
      'secrets-manager': '🔐',
      'iam': '👤',
      'cognito': '👤',
      'sso': '👤',
      'organizations': '🏢',
      'cloudformation': '🏗️',
      'cdk': '🏗️',
      'serverless': '🏗️',
      'sam': '🏗️',
      'amplify': '🏗️',
      'chalice': '🏗️',
      'zappa': '🏗️',
      'vercel': '🏗️',
      'netlify': '🏗️',
      'heroku': '🏗️',
      'railway': '🏗️',
      'render': '🏗️',
      'fly': '🏗️',
      'digitalocean': '🌊',
      'linode': '🌊',
      'vultr': '🌊',
      'ovh': '🌊',
      'scaleway': '🌊',
      'hetzner': '🌊',
      'aws': '☁️',
      'azure': '☁️',
      'gcp': '☁️',
      'ibm-cloud': '☁️',
      'oracle-cloud': '☁️',
      'alibaba-cloud': '☁️',
      'tencent-cloud': '☁️',
      'huawei-cloud': '☁️',
      'yandex-cloud': '☁️',
      'vk-cloud': '☁️',
      'selectel': '☁️',
      'timeweb': '☁️',
      'regru': '☁️',
      'beget': '☁️',
      'hostland': '☁️',
      'spaceweb': '☁️',
      'firstvds': '☁️',
      'nic': '☁️',
      'ru-center': '☁️',
      'regtime': '☁️',
      'jino': '☁️',
      'majordomo': '☁️',
      'cpanel': '☁️',
      'plesk': '☁️',
      'directadmin': '☁️',
      'ispmanager': '☁️',
      'webmin': '☁️',
      'cockpit': '☁️',
      'portainer': '🐳',
      'rancher': '🐳',
      'openshift': '☸️',
      'minikube': '☸️',
      'kind': '☸️',
      'k3s': '☸️',
      'microk8s': '☸️',
      'k0s': '☸️',
      'talos': '☸️',
      'flatcar': '☸️',
      'coreos': '☸️',
      'fedora-coreos': '☸️',
      'rhel-coreos': '☸️',
      'suse-caasp': '☸️',
      'ubuntu-core': '☸️',
      'snap': '📦',
      'flatpak': '📦',
      'appimage': '📦',
      'rpm': '📦',
      'deb': '📦',
      'apk': '📦',
      'pacman': '📦',
      'portage': '📦',
      'nix': '📦',
      'guix': '📦',
      'homebrew': '🍺',
      'macports': '🍺',
      'fink': '🍺',
      'pkgsrc': '📦',
      'slackpkg': '📦',
      'slapt-get': '📦',
      'swupd': '📦',
      'zypper': '📦',
      'yum': '📦',
      'dnf': '📦',
      'apt': '📦',
      'aptitude': '📦',
      'dpkg': '📦',
      'yast': '📦',
      'urpmi': '📦',
      'smart': '📦',
      'conary': '📦',
      'paludis': '📦',
      'pkg': '📦',
      'ports': '📦',
      'pkgin': '📦',
      'xbps': '📦',
      'opkg': '📦',
      'ipkg': '📦',
      'tazpkg': '📦'
    };
    return icons[language.toLowerCase()] || '📄';
  };

const openModelMenu = useCallback(() => {
  if (showModelMenu) {
    setShowModelMenu(false);
    return;
  }
  if (aiButtonRef.current) {
    const rect = aiButtonRef.current.getBoundingClientRect();
    setModelMenuCoords({
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    });
    setShowModelMenu(true);
  }
}, [showModelMenu]);

  useEffect(() => {
    if (!showModelMenu) return;
    function handler(e: MouseEvent) {
      if (aiButtonRef.current && !aiButtonRef.current.contains(e.target as Node)) {
        // check portal menu
        const menu = document.getElementById('ai-model-portal-menu');
        if (menu && menu.contains(e.target as Node)) return;
        setShowModelMenu(false);
      }
    }
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showModelMenu]);

  return (
    <AIPanelContainer className="ai-panel-root">
      <AIHeader>
        <AIHeaderTitle>
          <Sparkles size={16} />
          AI Помощник
        </AIHeaderTitle>
        <HeaderRight>
          <ProviderSelector>
            <ProviderButton
              $isActive={selectedProvider === 'gigachat'}
              onClick={() => setSelectedProvider('gigachat')}
              title="GigaChat - российский AI"
            >
              <Brain size={14} />
              GigaChat
            </ProviderButton>
            <ProviderButton
              $isActive={selectedProvider === 'chatgpt'}
              onClick={() => setSelectedProvider('chatgpt')}
              title="ChatGPT - OpenAI"
              disabled={!isAuthenticated && !isPremium}
            >
              <Zap size={14} />
              ChatGPT
            </ProviderButton>
          </ProviderSelector>

          <NewDialogButton onClick={() => onNewConversation && onNewConversation()} title="Новый диалог">
            <Sparkles size={14} /> Новый диалог
          </NewDialogButton>
          <ConversationSelect
            value={currentConversationId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id && onSelectConversation) onSelectConversation(id);
            }}
            title="Выбрать диалог"
          >
            <option value="">Без диалога</option>
            {conversations.map((c) => (
              <option key={c.id} value={c.id}>{c.title || `Диалог #${c.id}`}</option>
            ))}
          </ConversationSelect>
          {currentConversationId && (
            <>
              <SmallIconButton
                onClick={() => {
                  const title = window.prompt('Новое название диалога:');
                  if (title && onRenameConversation) onRenameConversation(currentConversationId, title);
                }}
                title="Переименовать диалог"
              >
                <Edit3 size={14} />
              </SmallIconButton>
              <SmallIconButton
                onClick={() => {
                  if (onDeleteConversation && window.confirm('Удалить текущий диалог?')) onDeleteConversation(currentConversationId);
                }}
                title="Удалить диалог"
              >
                <Trash2 size={14} />
              </SmallIconButton>
            </>
          )}
        </HeaderRight>
      </AIHeader>

      <AIMessages ref={messagesContainerRef} onScroll={handleMessagesScroll}>
        {currentFile && (
          <CurrentFileCard>
            <FileHeader>
              <FileName>
                <Pin size={14} />
                <FileText size={14} />
                {currentFile.name}
              </FileName>
              <FileStatus>
                <Eye size={10} />
                Активный файл
              </FileStatus>
            </FileHeader>
            <FileInfo>
              <FileLanguage>{currentFile.language.toUpperCase()}</FileLanguage>
              <span style={{ fontSize: '11px', color: '#6c757d' }}>
                {currentFile.content.split('\n').length} строк
              </span>
            </FileInfo>
            <FileContent>
              {currentFile.content.length > 200 
                ? `${currentFile.content.substring(0, 200)}...` 
                : currentFile.content}
            </FileContent>
          </CurrentFileCard>
        )}

        {attachedFiles.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', marginBottom: '8px' }}>
              📎 Прикрепленные файлы:
            </div>
            {attachedFiles.map((file, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '6px',
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{getLanguageIcon(file.language)}</span>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{file.name}</span>
                  <span style={{ fontSize: '10px', color: '#6c757d' }}>({file.language})</span>
                </div>
                <button
                  onClick={() => handleRemoveAttachedFile(file.name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6c757d', marginTop: '40px' }}>
            <Bot size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>Привет! Я ваш AI помощник для программирования.</p>
            <p>Задайте вопрос или выберите быстрый запрос ниже.</p>
            {currentFile && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <p style={{ fontSize: '13px', margin: '0 0 4px 0', fontWeight: '600' }}>
                  📁 Файл закреплен для работы с AI
                </p>
                <p style={{ fontSize: '12px', margin: '0' }}>
                  <strong>{currentFile.name}</strong> ({currentFile.language.toUpperCase()}) - 
                  AI может анализировать и дополнять этот код
                </p>
              </div>
            )}
          </div>
        )}

        {messages.filter(msg => msg.role !== 'system').map((message, filteredIndex) => {
          // Находим оригинальный индекс сообщения в массиве messages (с учетом system)
          // Используем более надежный способ: находим индекс в оригинальном массиве
          let messageIndex = -1;
          let nonSystemCount = 0;
          for (let i = 0; i < messages.length; i++) {
            if (messages[i].role !== 'system') {
              if (messages[i] === message && nonSystemCount === filteredIndex) {
                messageIndex = i;
                break;
              }
              nonSystemCount++;
            }
          }
          // Если не нашли, используем filteredIndex (fallback)
          if (messageIndex === -1) {
            messageIndex = filteredIndex;
          }
          
          const extractedCode = extractCodeFromMessage(message.content);
          const codeLanguage = extractedCode ? extractCodeLanguage(message.content) : undefined;
          const hasCode = extractedCode && message.role === 'assistant';
          
          // Определяем, печатается ли это сообщение (используем оригинальный индекс)
          const isTyping = message.role === 'assistant' && !completedTyping.has(messageIndex);
          // Проверяем, было ли сообщение остановлено (используем оригинальный индекс)
          const wasStopped = stopTypingRef.current.has(messageIndex);
          
          // Получаем отображаемый текст:
          // - Если печатается - из typingMessages (или пустую строку если еще не началось)
          // - Если было остановлено - ТОЛЬКО из typingMessages (не показываем полный текст!)
          // - Иначе - полный текст
          let displayedText: string;
          if (wasStopped) {
            // Если остановлено - показываем только то, что было напечатано
            // Если в typingMessages нет сохраненного текста, используем пустую строку
            displayedText = typingMessages.get(messageIndex) ?? '';
          } else if (isTyping) {
            // Если печатается - берем ТОЛЬКО из typingMessages (не показываем полный текст!)
            // Если в typingMessages еще нет значения, используем пустую строку (не message.content!)
            displayedText = typingMessages.get(messageIndex) ?? '';
          } else {
            // Если полностью напечатано - показываем полный текст
            displayedText = message.content;
          }
          
          return (
            <Message key={messageIndex} $isUser={message.role === 'user'}>
              <MessageAvatar $isUser={message.role === 'user'}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </MessageAvatar>
              <MessageContent $isUser={message.role === 'user'}>
                {/* Компонент для эффекта печатания - только для новых сообщений от assistant */}
                {isTyping && (
                  <TypingText
                    text={message.content}
                    speed={600}
                    cancel={wasStopped} // Передаем флаг остановки - это остановит анимацию немедленно
                    onUpdate={(text) => {
                      // Проверяем, не был ли остановлен этот индекc (используем оригинальный индекс)
                      if (stopTypingRef.current.has(messageIndex)) {
                        return; // Не обновляем, если остановлен
                      }
                      setTypingMessages(prev => {
                        const newMap = new Map(prev);
                        newMap.set(messageIndex, text);
                        return newMap;
                      });
                      // Автопрокрутка только если включено авто‑следование
                      if (autoFollowRef.current) {
                        const container = messagesContainerRef.current;
                        if (container) {
                          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                        } else {
                          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    onComplete={() => {
                      // Проверяем, не был ли остановлен этот индекc (используем оригинальный индекс)
                      if (stopTypingRef.current.has(messageIndex)) {
                        // Если остановлен, не заменяем текст на полный - оставляем текущий
                        return;
                      }
                      // Помечаем как завершенное
                      setCompletedTyping(prev => new Set(prev).add(messageIndex));
                      // Только если не было остановлено, заменяем на полный текст
                      setTypingMessages(prev => {
                        const newMap = new Map(prev);
                        newMap.set(messageIndex, message.content);
                        return newMap;
                      });
                    }}
                  />
                )}
                
                {isTyping || wasStopped ? (
                  <FormattedText>
                    {formatMessageText(message.content, true, displayedText, onInsertCode, currentFile)}
                  </FormattedText>
                ) : (
                  <FormattedText>
                    {formatMessageText(message.content, false, message.content, onInsertCode, currentFile)}
                  </FormattedText>
                )}
                {!isTyping && (
                  <MessageActions>
                    <ActionButton onClick={() => copyToClipboard(message.content)} title="Копировать">
                      <Copy size={12} />
                    </ActionButton>
                  </MessageActions>
                )}
                {/* Отображение даты отправки сообщения */}
                {message.timestamp && (
                  <MessageTime $isUser={message.role === 'user'}>
                    {formatMessageTime(message.timestamp)}
                  </MessageTime>
                )}
              </MessageContent>
            </Message>
          );
        })}

        {isLoading && (
          <Message $isUser={false}>
            <MessageAvatar $isUser={false}>
              <Bot size={16} />
            </MessageAvatar>
            <MessageContent $isUser={false}>
              <LoadingIndicator>
                <Loader size={16} className="animate-spin" />
                AI думает (<LinuxCommandAnimation />)
              </LoadingIndicator>
            </MessageContent>
          </Message>
        )}

        <div ref={messagesEndRef} />
      </AIMessages>

      <AIInput style={{ position: 'relative' }}>
        <QuickActions $collapsed={!showQuick}>
          <QuickActionButton onClick={() => handleGenerateCode()}>
            <Sparkles size={12} />
            Сгенерировать код
          </QuickActionButton>
          <QuickActionButton onClick={() => handleContextualMessage('Объясни')}>
            <Code size={12} />
            Объяснить код
          </QuickActionButton>
          <QuickActionButton onClick={() => handleContextualMessage('Оптимизируй')}>
            <Lightbulb size={12} />
            Оптимизировать
          </QuickActionButton>
          <QuickActionButton onClick={() => handleContextualMessage('Найди ошибки в')}>
            <Bug size={12} />
            Найти ошибки
          </QuickActionButton>
          <QuickActionButton onClick={() => handleContextualMessage('Рефактори')}>
            <Settings size={12} />
            Рефакторинг
          </QuickActionButton>
        </QuickActions>

        <InputContainer>
          <InputRow>
            <InputField
              ref={inputRef}
              defaultValue=""
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Задайте вопрос AI помощнику..."
              rows={3}
            />
            {isGenerating ? (
              <SendButton onClick={handleStop} style={{ backgroundColor: '#ef4444' }} title="Остановить генерацию">
                <Square size={16} />
              </SendButton>
            ) : (
              <SendButton onClick={handleSend} disabled={buttonDisabled || isLoading}>
                <Send size={16} />
              </SendButton>
            )}
          </InputRow>
        </InputContainer>
        
        <BottomButtonsContainer>
          <div className="ai-model-select-root" style={{ position: 'relative', display: 'flex', gap: 6, width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
            <ModelButton
              ref={aiButtonRef}
              onClick={openModelMenu}
              title={`Выбрать модель AI (текущая: ${selectedModel})`}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                AI: {selectedModel === 'GigaChat Lite' ? 'Giga Lite' : 
                     selectedModel === 'GigaChat Pro' ? 'Giga Pro' : 
                     selectedModel === 'GigaChat Max' ? 'Giga Max' : 
                     selectedModel}
              </span>
              <ChevronUp size={18} strokeWidth={2.5} />
            </ModelButton>
            <AttachButton
              ref={attachButtonRef}
              onClick={() => {
                if (attachButtonRef.current) {
                  const rect = attachButtonRef.current.getBoundingClientRect();
                  setFileMenuCoords({
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                  });
                }
                setShowFileSelector(!showFileSelector);
              }}
              title="Прикрепить файл"
            >
              <Paperclip size={14} />
              <span>Файл</span>
            </AttachButton>
            <QuickActionMainButton
              onClick={() => setShowQuick(!showQuick)}
              title="Быстрые действия"
            >
              <Lightbulb size={14} />
              <span>Быстрые действия</span>
            </QuickActionMainButton>
            <QuickActionMainButton
              onClick={() => setShowDeveloperContact(true)}
              title="Связь с разработчиком"
            >
              <Mail size={14} />
              <span>Связь с разработчиком</span>
            </QuickActionMainButton>
            {showModelMenu && modelMenuCoords && ReactDOM.createPortal(
              <FileSelector
                id="ai-model-portal-menu"
                style={{
                  position: 'fixed',
                  left: modelMenuCoords.left,
                  top: modelMenuCoords.top - 112 /* меню 3 item x 36 height + 2px border + отступы */,
                  width: modelMenuCoords.width * 1.5,
                  minWidth: modelMenuCoords.width * 1.5,
                  zIndex: 2999,
                }}
              >
    {['GigaChat Lite','GigaChat Pro','GigaChat Max'].map((name) => {
      let borderColor = '#27283A'; // default
      if (selectedModel === name) {
        if (name === 'GigaChat Lite') borderColor = '#CD7F32'; // bronze
        else if (name === 'GigaChat Pro') borderColor = '#C0C0C0'; // silver
        else if (name === 'GigaChat Max') borderColor = '#FFD700'; // gold
      }
      
      return (
        <FileOption
          key={name}
          onClick={() => { setSelectedModel(name as 'GigaChat Lite' | 'GigaChat Pro' | 'GigaChat Max'); setShowModelMenu(false); }}
          style={selectedModel === name ? { 
            background: '#21445B', 
            color: '#fff', 
            fontWeight: 700, 
            border: `2px solid ${borderColor}`,
            boxShadow: `0 0 8px ${borderColor}40`
          } : {}}
        >
          <span>{name}</span>
        </FileOption>
      );
    })}
              </FileSelector>,
              document.body
            )}
            {showFileSelector && fileMenuCoords && ReactDOM.createPortal(
              <FileSelector
                style={{
                  position: 'fixed',
                  left: fileMenuCoords.left,
                  top: fileMenuCoords.top - 200, /* позиционируем над кнопкой */
                  width: fileMenuCoords.width * 1.5,
                  minWidth: 200,
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 2999,
                }}
              >
                {availableFiles.map((file, index) => (
                  <FileOption
                    key={index}
                    onClick={() => handleAttachFile(file)}
                  >
                    <span>{getLanguageIcon(file.language)}</span>
                    <span>{file.name}</span>
                    <span style={{ fontSize: '10px', color: '#6c757d' }}>
                      ({file.language})
                    </span>
                  </FileOption>
                ))}
                {availableFiles.length === 0 && (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#6c757d', fontSize: '12px' }}>
                    Нет доступных файлов
                  </div>
                )}
              </FileSelector>,
              document.body
            )}
          </div>
        </BottomButtonsContainer>
      </AIInput>
      
      <DeveloperContactModal
        isOpen={showDeveloperContact}
        onClose={() => setShowDeveloperContact(false)}
      />
    </AIPanelContainer>
  );
};

export default React.memo(AIPanel);
