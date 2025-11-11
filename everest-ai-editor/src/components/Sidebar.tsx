import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  File, 
  Folder, 
  FolderOpen, 
  Settings, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Moon, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Sun, 
  Plus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Search,
  GitBranch,
  Play,
  Upload,
  Download,
  Trash2,
  MessageCircle,
  Send,
  X
} from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FileNode, createFileTree, getFileIcon, isTextFile, downloadFile, readMultipleFiles } from '../utils/fileUtils';
import ProfileModal from './ProfileModal';
import { trackGoal, YM_EVENTS } from '../utils/yandexMetrika';
import { User, useAuth } from '../contexts/AuthContext';
import FileCreator from './FileCreator';
import TelegramUsernameModal from './TelegramUsernameModal';
import TelegramLinkModal from './TelegramLinkModal';
import JSZip from 'jszip';
import { buildApiUrl } from '../config/api';

// Расширяем window для поддержки yaContextCb и Ya (без лишних ts-expect-error)
declare global {
  interface Window {
    yaContextCb: any[];
    Ya: any;
  }
}

interface SidebarProps {
  files: Record<string, string>;
  onFileSelect: (filePath: string) => void;
  onFilesAdd: (files: Record<string, string>) => void;
  onFileDelete: (filePath: string) => void;
  activeFile: string | null;
  isDarkTheme: boolean;
  onAuthClick: () => void;
  onTelegramLoginClick?: () => void;
  onAdminClick: () => void;
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  token?: string | null;
}

const SidebarContainer = styled.div`
  width: 250px;
  background-color: ${props => props.theme.colors.sidebar};
  border-right: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const SidebarHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Logo = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: white !important;
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`;

const Section = styled.div`
  margin-bottom: 16px;
`;

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px; // uniform height
`;
const SectionTitle = styled.div`
  padding: 8px 16px;
  font-size: 16px;
  line-height: 32px;
  font-weight: 600;
  color: white !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;
const SectionTitleActions = styled.div`
  display: flex;
  gap: 8px;
  margin-right: 10px;
  height: 32px;
  align-items: center;
`;

const FileItem = styled.div<{ $isActive: boolean; $level?: number }>`
  display: flex;
  align-items: center;
  padding: 6px 16px;
  padding-left: ${props => (props.$level || 0) * 16 + 16}px;
  cursor: pointer;
  background-color: ${props => props.$isActive ? props.theme.colors.primary : 'transparent'};
  color: white !important;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background-color: ${props => props.$isActive ? props.theme.colors.primary : props.theme.colors.surface};
  }

  &:hover .file-actions {
    opacity: 1;
  }
`;

const FileActions = styled.div`
  position: absolute;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
`;

const FileActionButton = styled.button`
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: white !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.surface};
    color: white !important;
  }
`;

const FolderIcon = styled.div`
  margin-right: 8px;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const FileIcon = styled.div`
  margin-right: 8px;
  display: flex;
  align-items: center;
  font-size: 16px;
`;

const FileName = styled.span`
  font-size: 14px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const UserSection = styled.div`
  padding: 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.aiUserMessageText};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: white !important;
  margin-bottom: 2px;
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: white !important;
`;

const UserActions = styled.div`
  display: flex;
  gap: 8px;
`;

const UserActionButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.background};
  color: white !important;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.surface};
    border-color: ${props => props.theme.colors.primary};
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LoginPrompt = styled.div`
  text-align: center;
  padding: 16px;
  color: white !important;
  font-size: 14px;
`;

const LoginButton = styled.button`
  width: 100%;
  padding: 8px 16px;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.aiUserMessageText};
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.primaryHover};
  }
`;


const Toolbar = styled.div`
  padding: 8px 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  gap: 8px;
`;

const ToolbarButton = styled.button`
  background: none;
  border: none;
  color: white !important;
  cursor: pointer;
  padding: 0 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;

  &:hover {
    background-color: ${props => props.theme.colors.surface};
    color: white !important;
  }

  svg {
    vertical-align: middle;
    display: inline-block;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background-color: ${props => props.theme.colors.background};
  color: white !important;
  font-size: 12px;
  margin-bottom: 8px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const LogoButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  }

  &:active {
    transform: translateY(0);
  }
`;

const FeedbackModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: ${props => (props.$isOpen ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const FeedbackModalContent = styled.div`
  background: linear-gradient(145deg, #1e1e2e 0%, #2a2a3e 100%);
  border-radius: 20px;
  padding: 40px;
  width: 500px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(102, 126, 234, 0.3);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: rotate(90deg);
  }
`;

const FeedbackTitle = styled.h2`
  color: white;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const FeedbackSubtitle = styled.p`
  color: #999;
  font-size: 14px;
  margin: 0 0 32px 0;
`;

const FeedbackText = styled.div`
  color: #e0e0e0;
  font-size: 16px;
  line-height: 1.8;
  margin-bottom: 32px;

  p {
    margin: 0 0 16px 0;
  }

  strong {
    color: #667eea;
    font-weight: 600;
  }

  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const TelegramLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #0088cc 0%, #0066aa 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-top: 16px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 136, 204, 0.4);
  }
`;

const BetaBadge = styled.span`
  display: inline-block;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const VersionBadge = styled.span`
  display: inline-block;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 11px;
  font-weight: 500;
  margin-left: 12px;
  opacity: 0.7;
  letter-spacing: 0.3px;
`;

const BottomActions = styled.div`
  width: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const WideButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 0;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  &:hover { background: linear-gradient(135deg, #764ba2 0%, #667eea 100%); }
`;
const MiniActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 7px;
`;

// Модальное окно создания файла/папки (без стартового экрана)
const FileCreateModal: React.FC<{
  open: boolean;
  type: 'file' | 'folder';
  onClose: () => void;
  onCreate: (name: string) => void;
}> = ({ open, type, onClose, onCreate }) => {
  const [inputValue, setInputValue] = useState('');
  const handleSubmit = () => {
    let trimmed = inputValue.trim();
    if (!trimmed) return;
    if (type === 'folder') {
      // убираем закрывающие слэши (повторные не нужны), добавляем ровно 1 слэш
      trimmed = trimmed.replace(/\/+$/,'') + '/';
    }
    onCreate(trimmed);
    setInputValue('');
  };
  return open ? (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#23232b',borderRadius:12,padding:24,minWidth:320,boxShadow:'0 6px 32px #000c'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontWeight:700,fontSize:18,marginBottom:16,color:'#fff'}}>Создать {type === 'file'?'файл':'папку'}</div>
        <input type="text" value={inputValue}
          onChange={e=>setInputValue(e.target.value)}
          placeholder={`Введите имя ${type==='file'?'файла':'папки'}`}
          style={{width:'100%',padding:12,borderRadius:8,border:'1px solid #444',marginBottom:20,fontSize:16,background:'#292933',color:'#fff',outline:'none'}} autoFocus />
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'8px 16px',borderRadius:4,background:'#444',color:'#fff',border:'none',fontSize:15,cursor:'pointer'}}>Отмена</button>
          <button onClick={handleSubmit} style={{padding:'8px 22px',borderRadius:4,background:'#0af',color:'#fff',border:'none',fontWeight:700,fontSize:15,cursor:'pointer'}}>Создать</button>
        </div>
      </div>
    </div>
  ) : null;
};


const Sidebar: React.FC<SidebarProps> = ({
  files,
  onFileSelect,
  onFilesAdd,
  onFileDelete,
  activeFile,
  isDarkTheme,
  onAuthClick,
  onTelegramLoginClick,
  onAdminClick,
  isAuthenticated,
  user,
  isAdmin,
  token
}) => {
  const { loginWithTelegram: updateUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [fileCreateModal, setFileCreateModal] = useState<null|('file'|'folder')>(null);
  const [showTelegramUsernameModal, setShowTelegramUsernameModal] = useState(false);
  const [showTelegramLinkModal, setShowTelegramLinkModal] = useState(false);
  const [isSendingToTelegram, setIsSendingToTelegram] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [dragOverError, setDragOverError] = useState<string | null>(null);

  const fileTree = createFileTree(files);

  const handleFileDownload = (filePath: string) => {
    const content = files[filePath];
    if (content) {
      const filename = filePath.split('/').pop() || 'file';
      downloadFile(content, filename);
      trackGoal(YM_EVENTS.FILE_DOWNLOAD); // Фиксация цели скачивания файла
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileContents = await readMultipleFiles(files);
      onFilesAdd(fileContents);
      trackGoal && trackGoal('file_upload'); // Не стандартная, если хочешь — добавить новую цель YM
    }
  };

  const handleFileDelete = (filePath: string) => {
    if (window.confirm(`Удалить файл ${filePath}?`)) {
      onFileDelete(filePath);
    }
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const addToZip = (files: Record<string, string>) => {
      Object.entries(files).forEach(([path, content]) => {
        // не кладём '.__folder__'
        if (path === '/') return;
        if (path.endsWith('/')) return;
        zip.file('everest-ai-editor'+path, content);
      });
    };
    addToZip(files);
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'everest-ai-editor.zip';
    document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(), 100);
    trackGoal(YM_EVENTS.FILE_DOWNLOAD); // Фиксация цели скачивания ZIP
  };

  const handleDownloadToTelegram = async () => {
    if (!isAuthenticated || !user) {
      onAuthClick();
      return;
    }

    // Если пользователь авторизован через Telegram, у него есть telegramId
    if (user.telegramId) {
      // Отправляем файлы напрямую
      await sendZipToTelegram();
      return;
    }

    // Если пользователь авторизован классически, проверяем наличие telegramUsername
    if (!user.telegramUsername) {
      // Показываем модальное окно для ввода username
      setShowTelegramUsernameModal(true);
      return;
    }

    // Если есть telegramUsername, но нет telegramId, проверяем, может быть аккаунт уже связан
    // (пользователь мог связать аккаунт через /link в боте)
    try {
      const response = await fetch(buildApiUrl('/user/profile'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.telegramId) {
          // Аккаунт уже связан, обновляем пользователя в контексте и отправляем файлы
          const updatedUser = { ...user, ...data.user };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          if (token) {
            updateUser(token, updatedUser);
          }
          // Отправляем файлы
          await sendZipToTelegram();
          return;
        }
      }
    } catch (error) {
      console.error('Ошибка проверки пользователя:', error);
    }

    // Если telegramId все еще нет, показываем инструкцию в модальном окне
    setShowTelegramLinkModal(true);
  };

  const sendZipToTelegram = async (telegramIdOrUsername?: string) => {
    setIsSendingToTelegram(true);
    try {
      // Создаем ZIP архив
      const zip = new JSZip();
      const addToZip = (files: Record<string, string>) => {
        Object.entries(files).forEach(([path, content]) => {
          if (path === '/') return;
          if (path.endsWith('/')) return;
          zip.file('everest-ai-editor'+path, content);
        });
      };
      addToZip(files);
      
      // Генерируем blob
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Создаем FormData для отправки
      const formData = new FormData();
      formData.append('file', blob, 'everest-ai-editor.zip');
      // Не передаем telegramId, сервер сам определит из данных пользователя

      const response = await fetch(buildApiUrl('/files/send-zip-to-telegram'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Неизвестная ошибка';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        // Если получили telegramId, обновляем пользователя в контексте
        if (data.telegramId && user && token) {
          const updatedUser = { ...user, telegramId: data.telegramId };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          updateUser(token, updatedUser);
        }
        
        alert('✅ Файлы успешно отправлены в Telegram!');
        trackGoal(YM_EVENTS.FILE_DOWNLOAD);
      } else {
        alert(`❌ Ошибка отправки: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error: any) {
      console.error('Ошибка отправки в Telegram:', error);
      alert(`❌ Ошибка отправки: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsSendingToTelegram(false);
    }
  };

  const handleTelegramUsernameSuccess = async () => {
    // После успешного сохранения username, отправляем файлы
    // Бот попытается отправить по username, и если пользователь начал диалог,
    // мы получим его telegramId и сохраним
    await sendZipToTelegram();
  };


  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const handleDragStart = (path: string) => setDraggingPath(path);
  const handleDragEnd = () => { setDraggingPath(null); setDragOverPath(null); setDragOverError(null); };
  const handleDragOver = (targetPath: string, nodeType: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingPath === targetPath || (nodeType==='folder' && targetPath.startsWith(draggingPath + '/'))) {
      setDragOverError('Нельзя переместить в себя или своего потомка!');
    } else {
      setDragOverError(null);
    }
    setDragOverPath(targetPath);
  };
  const handleDrop = (targetPath: string, nodeType: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverError || !draggingPath) return;
    // Вставить сюда функцию перемещения файла/директории с draggingPath в targetPath
    // onMove(draggingPath, targetPath)
    handleDragEnd();
  };

  function renderFileTree(nodes: FileNode[], level = 0) {
    return nodes.map(node => {
      const isExpanded = expandedFolders.has(node.path);
      const isActive = activeFile === node.path;
      const isDragSource = draggingPath === node.path;
      const isDragOver = dragOverPath === node.path;
      const isError = isDragOver && dragOverError;
      
      if (node.type === 'folder') {
        return (
          <div key={node.path}
               draggable
               onDragStart={() => handleDragStart(node.path)}
               onDragEnd={handleDragEnd}
               onDragOver={handleDragOver(node.path, 'folder')}
               onDrop={handleDrop(node.path, 'folder')}
          >
            <FileItem
              $isActive={false}
              $level={level}
              className={isDragSource ? 'drag-source' : isDragOver ? (isError ? 'drag-error' : 'drag-over') : ''}
              onClick={() => toggleFolder(node.path)}
              style={isDragOver && !isError ? {border:'2px solid #09f',background:'#111'} : isError ? {border:'2px solid #f33',background:'#311'} : {}}
            >
              <FolderIcon>
                {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
              </FolderIcon>
              <FileName>{node.name}</FileName>
            </FileItem>
            {isExpanded && node.children && renderFileTree(node.children, level + 1)}
          </div>
        );
      } else {
        return (
          <FileItem
            key={node.path}
            draggable
            onDragStart={() => handleDragStart(node.path)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver(node.path, 'file')}
            onDrop={handleDrop(node.path, 'file')}
            $isActive={isActive}
            $level={level}
            className={isDragSource ? 'drag-source' : isDragOver ? (isError ? 'drag-error' : 'drag-over') : ''}
            style={isDragOver && !isError ? {border:'2px solid #09f',background:'#191'} : isError ? {border:'2px solid #f33',background:'#311'} : {}}
            onClick={() => onFileSelect(node.path)}
          >
            <FileIcon>{getFileIcon(node.name)}</FileIcon>
            <FileName title={node.path}>{node.name}</FileName>
            <FileActions className="file-actions">
              <FileActionButton
                onClick={(e) => {e.stopPropagation();handleFileDownload(node.path);}}
                title="Скачать файл"
              >
                <Download size={12} />
              </FileActionButton>
              <FileActionButton
                onClick={(e) => {e.stopPropagation();handleFileDelete(node.path);}}
                title="Удалить файл"
              >
                <Trash2 size={12} />
              </FileActionButton>
            </FileActions>
          </FileItem>
        );
      }
    });
  }

  useEffect(() => {
    // Рендерим Yandex RTB, если API уже загружено
    if (window.yaContextCb) {
      window.yaContextCb.push(() => {
        if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
          window.Ya.Context.AdvManager.render({
            blockId: 'R-A-17622869-2',
            renderTo: 'yandex_rtb_R-A-17622869-2'
          });
        }
      });
    }
  }, []);

  return (
    <SidebarContainer className="sidebar-root">
      <SidebarHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoButton onClick={() => { trackGoal(YM_EVENTS.FEEDBACK_OPEN); setShowFeedbackModal(true); }}>
            <span>Everest AI</span>
            <BetaBadge>Beta</BetaBadge>
          </LogoButton>
          <VersionBadge>v0.0.2</VersionBadge>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <Section>
          <SectionTitleRow>
            <SectionTitle>Файлы</SectionTitle>
            <SectionTitleActions>
              <ToolbarButton title="Создать файл" onClick={() => setFileCreateModal('file')}>
                <Plus size={16}/>
              </ToolbarButton>
              <ToolbarButton title="Создать папку" onClick={() => setFileCreateModal('folder')}>
                <Folder size={16}/>
              </ToolbarButton>
            </SectionTitleActions>
          </SectionTitleRow>
          <SearchInput
            type="text"
            placeholder="Поиск файлов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {renderFileTree(fileTree)}
          {Object.keys(files).length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'white' }}>
              <Upload size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>Нет открытых файлов</p>
              <p style={{ fontSize: '12px', margin: 0 }}>Загрузите файлы для начала работы</p>
            </div>
          )}
        </Section>

        {/* Удалённый раздел Инструменты */}
      </SidebarContent>

      <BottomActions>
        <WideButton onClick={() => fileInputRef.current?.click()}>
          <Upload size={17} /> Загрузить файл
        </WideButton>
        <WideButton onClick={handleDownloadZip}>
          <Download size={17} /> Скачать каталог
        </WideButton>
        {isAuthenticated && (
          <WideButton 
            onClick={handleDownloadToTelegram}
            disabled={isSendingToTelegram}
          >
            <Send size={17} /> 
            {isSendingToTelegram ? 'Отправка...' : 'Скачать в Telegram'}
          </WideButton>
        )}
        <MiniActions>
          {/* ToolbarButton for Create File and Create Folder moved to SectionTitleActions */}
        </MiniActions>
      </BottomActions>

      <FileCreateModal
        open={fileCreateModal!==null}
        type={fileCreateModal||'file'}
        onClose={()=>setFileCreateModal(null)}
        onCreate={name => {
          setFileCreateModal(null);
          // Корректный parent: если только / или ничего — корень, иначе внутрь первой открытой вложенной
          let base = '/';
          const folderList = Array.from(expandedFolders).filter(f=>f!=='/').sort();
          if (folderList.length > 0) {
            base = folderList[0];
            if (!base.endsWith('/')) base += '/';
          }
          if (fileCreateModal==='file') {
            const newPath = `${base}${name.replace(/[\/]+$/,'')}`;
            onFilesAdd({ [newPath]: '' });
          } else {
            const newDir = `${base}${name.replace(/[\/]+$/,'')}/`;
            onFilesAdd({ [newDir]: '__folder__' });
          }
        }}
      />

      {isAuthenticated && user ? (
        <UserSection>
          <UserInfo>
            <UserAvatar>
              {user.username.charAt(0).toUpperCase()}
            </UserAvatar>
            <UserDetails>
              <UserName>{user.username}</UserName>
              <UserEmail>{user.email}</UserEmail>
            </UserDetails>
          </UserInfo>
          <UserActions>
            {isAdmin && (
              <UserActionButton onClick={onAdminClick}>
                Админ
              </UserActionButton>
            )}
            <UserActionButton onClick={() => setShowProfileModal(true)}>
              Профиль
            </UserActionButton>
            <UserActionButton onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.reload();
            }}>
              Выйти
            </UserActionButton>
          </UserActions>
        </UserSection>
      ) : (
        <UserSection>
          <LoginButton onClick={onAuthClick}>
            Войти / Регистрация
          </LoginButton>
        </UserSection>
      )}

      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.html,.css,.scss,.json,.xml,.yaml,.md,.sql,.sh,.ps1,.bat,.txt,.log,.csv"
        onChange={handleFileUpload}
      />
      
      <TelegramUsernameModal
        isOpen={showTelegramUsernameModal}
        onClose={() => setShowTelegramUsernameModal(false)}
        onSuccess={handleTelegramUsernameSuccess}
        token={token || null}
      />
      
      <TelegramLinkModal
        isOpen={showTelegramLinkModal}
        onClose={() => setShowTelegramLinkModal(false)}
        username={user?.username || ''}
      />
      
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <FeedbackModalOverlay $isOpen={showFeedbackModal} onClick={() => setShowFeedbackModal(false)}>
        <FeedbackModalContent onClick={(e) => e.stopPropagation()}>
          <CloseButton onClick={() => setShowFeedbackModal(false)}>
            <X size={20} />
          </CloseButton>
          
          <FeedbackTitle>Обратная связь</FeedbackTitle>
          <FeedbackSubtitle>Ваше мнение важно для нас</FeedbackSubtitle>
          
          <FeedbackText>
            <p>
              Сервис <strong>Everest AI Code Editor</strong> находится в активной стадии бета-тестирования. 
              Мы непрерывно работаем над улучшением функционала и повышением качества платформы.
            </p>
            
            <p>
              Если вы столкнулись с ошибками, обнаружили баги или у вас есть предложения по улучшению сервиса, 
              мы будем рады получить вашу обратную связь.
            </p>
            
            <p>
              Для связи с командой разработки, пожалуйста, напишите в Telegram:
            </p>
            
            <TelegramLink href="https://t.me/EverestAlpine" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={20} />
              @EverestAlpine
            </TelegramLink>
          </FeedbackText>
        </FeedbackModalContent>
      </FeedbackModalOverlay>
      {dragOverError && (
  <div style={{position:'fixed',left:20,bottom:70,zIndex:9999,padding:10,background:'#a00',color:'white',borderRadius:5,maxWidth:250,fontWeight:600}}>
    {dragOverError}
  </div>
)}
      {/* Добавляем рекламный блок Яндекс RTB */}
      <div
        id="yandex_rtb_R-A-17622869-2"
        style={{
          width: '250px', // ширина как у sidebar
          height: '240px', // под 6 иконок файлов
          margin: '20px auto 0 auto',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#181820'
        }}
      />
    </SidebarContainer>
  );
};

export default Sidebar;