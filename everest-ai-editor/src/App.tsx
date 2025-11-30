import React, { useState, useEffect, useRef } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Sidebar from './components/Sidebar';
import CodeEditor, { CodeEditorRef } from './components/CodeEditor';
import AIPanel from './components/AIPanel';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import FileCreator from './components/FileCreator';
import FileSharingPage from './pages/FileSharingPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { buildApiUrl, authHeaders } from './config/api';
import { lightTheme, darkTheme } from './styles/themes';
import { GlobalStyles } from './styles/GlobalStyles';
import { getLanguageFromExtension } from './utils/fileUtils';

const AppContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
`;

const EditorContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
`;

const PanelWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
`;



// Стили для главной страницы с анимированным градиентом
const GradientBackground = styled.div<{ theme: 'light' | 'dark' }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  
  ${props => props.theme === 'dark' 
    ? `
      background: linear-gradient(135deg, #4c51bf 0%, #5a67d8 25%, #6b46c1 50%, #7c3aed 75%, #8b5cf6 100%);
      background-size: 400% 400%;
      animation: gradientFlowDark 8s ease infinite;
    `
    : `
      background: linear-gradient(135deg, #db2777 0%, #ec4899 25%, #ef4444 50%, #f97316 75%, #fb7185 100%);
      background-size: 400% 400%;
      animation: gradientFlowLight 8s ease infinite;
    `
  }
  
  @keyframes gradientFlowDark {
    0% {
      background-position: 0% 50%;
    }
    25% {
      background-position: 100% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    75% {
      background-position: 0% 100%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  
  @keyframes gradientFlowLight {
    0% {
      background-position: 0% 50%;
    }
    25% {
      background-position: 100% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    75% {
      background-position: 0% 100%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EditorBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: ${props => props.theme.colors.background};
  z-index: 1;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Header = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: 10;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Content = styled.div`
  position: fixed;
  top: 60px;
  left: 0;
  width: 100%;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  z-index: 2;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Title = styled.h1`
  font-size: 4rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Subtitle = styled.p`
  font-size: 1.5rem;
  margin-bottom: 3rem;
  text-align: center;
  opacity: 0.9;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ButtonGroup = styled.div`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
`;

interface FileTab {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  isDirty?: boolean;
}

// Компонент для главной страницы
const HomePage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [welcomeTheme] = useState<'light' | 'dark'>('dark');
  const [isIdeaOpen, setIsIdeaOpen] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleStartCoding = () => {
    setIsIdeaOpen(true);
  };

  const handleLearnMore = () => {
    setIsLearnMoreOpen(true);
  };

  const handleSubmitIdea = async () => {
    if (!idea.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const SYSTEM_PROMPT = "Ты — Expert Software Engineer, интегрированный непосредственно в веб-редактор кода. Твоя главная цель — быть умным, точным и полезным партнером для разработчиков любого уровня: от новичков, пишущих первый Hello World, до Senior-инженеров, оптимизирующих сложные системы.\n\nТы должен строго следовать этим принципам:\n1.  Контекст — всё. Ты видишь весь файл и проект пользователя. Всегда учитывай этот контекст. Не предлагай решений, которые противоречат уже написанному коду, архитектуре или используемым технологиям.\n2.  Объясняй, а не просто давай код. Для новичков — разбирай концепции, для профессионалов — давайте сжатые, технически точные пояснения. Помоги учиться и понимать, а не просто копировать.\n3.  Безопасность и лучшие практики. Продвигай чистый, безопасный (с точки зрения уязвимостей) и эффективный код. Если видишь потенциальную ошибку или анти-паттерн — вежливо укажи на это и предложи исправление.\n4.  Предлагай варианты. Если задача имеет несколько решений (разная архитектура, библиотеки), кратко опиши плюсы и минусы каждого.\n5.  Адаптивный тон и детализация: если вопрос простой или код похож на продвинутый — отвечай кратко; если видишь, что пользователь только учится (например, пишет функцию console.log для отладки) — будь более развернутым и педагогичным. Всегда избегай снисходительного тона.\n---\nКонкретные сценарии и как на них реагировать:\n1. Генерация кода: предложи современный синтаксис, комментируй строки, уточняй детали.\n2. Объяснение кода: анализируй построчно, объясняй конструкцию и общий вывод.\n3. Debug: анализируй ошибки как debugger, четко указывай на источник проблемы и предлагай исправления.\n4. Рефакторинг: укажи запахи кода, предложи технику, покажи код до и после, объясни преимущество.\n5. Оптимизация: находи узкие места, советуй другие алгоритмы или структуры данных.\n6. Технологии: дай working пример кода и brief best practice.\n7. Архитектура и паттерны: опиши основные варианты и краткие различия.\nФормат ответа — только plain text для объяснений. Не используй markdown-выделения, не делай текст жирным, курсивом или подчёркнутым. Код — только в markdown-блоках с языком. Всегда начинай первый диалог с приветствия 'Привет! Я ваш AI-ассистент в редакторе. Готов помочь с генерацией кода, отладкой и объяснениями. Что вы хотите сделать сегодня?'";
      const userTimestamp = Date.now();
      const initMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: idea.trim(), timestamp: userTimestamp }
      ];
      const headers = authHeaders(token || undefined);
      const res = await fetch(buildApiUrl('/ai/chat'), {
        method: 'POST', headers, body: JSON.stringify({ message: idea.trim(), provider: 'GigaChat-2' })
      });
      if (res.ok) {
        const data = await res.json();
        const assistantTimestamp = Date.now();
        const withAssistant = initMessages.concat([{ role: 'assistant', content: data.response, timestamp: assistantTimestamp }]);
        localStorage.setItem('aiMessages', JSON.stringify(withAssistant));
      } else {
        localStorage.setItem('aiMessages', JSON.stringify(initMessages));
      }
      setIsIdeaOpen(false);
      navigate('/webcode');
    } catch (e) {
      setSubmitError('Не удалось отправить идею. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // При нажатии Enter (без Shift) отправляем форму
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitIdea();
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <GlobalStyles />
      <GradientBackground theme={welcomeTheme} />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        zIndex: 2
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 700,
          marginBottom: '1rem',
          textAlign: 'center',
          textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
        }}>Everest Code</h1>
        <p style={{
          fontSize: '1.5rem',
          marginBottom: '3rem',
          textAlign: 'center',
          opacity: 0.9,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>Современный веб-редактор с поддержкой ИИ</p>

        <div style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleStartCoding}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '1rem 2rem',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              minWidth: '200px'
            }}
          >
            🚀 Начать программировать
          </button>
          <button
            onClick={handleLearnMore}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '1rem 2rem',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              minWidth: '200px'
            }}
          >
            📚 Узнать больше
          </button>
        </div>

        {isIdeaOpen && (
          <div
            onClick={() => !isSubmitting && setIsIdeaOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(560px, 92vw)', borderRadius: 16, padding: 24,
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', backdropFilter: 'blur(14px)'
              }}
            >
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Какую идею хотите воплотить?</h3>
              <p style={{ margin: '8px 0 16px', opacity: .85 }}>Мы подготовим стартовые рекомендации при помощи GigaChat Lite.</p>
              <textarea
                placeholder="Опишите кратко задачу или идею проекта..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%', minHeight: 96, resize: 'vertical', padding: '12px 14px',
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.25)', color: '#fff'
                }}
              />
              {submitError && <div style={{ color: '#ff6b6b', marginTop: 8 }}>{submitError}</div>}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  onClick={() => setIsIdeaOpen(false)}
                  disabled={isSubmitting}
                  style={{
                    background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 10, padding: '10px 14px', color: '#fff', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Отмена
                </button>
                <button
                  disabled={!idea.trim() || isSubmitting}
                  onClick={handleSubmitIdea}
                  style={{
                    background: '#0088cc', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10,
                    padding: '10px 14px', color: '#fff', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Отправляем…' : 'Отправить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLearnMoreOpen && (
          <div
            onClick={() => setIsLearnMoreOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(600px, 90vw)', maxHeight: '90vh', overflowY: 'auto',
                borderRadius: 20, padding: 32,
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)'
              }}
            >
              <h2 style={{ margin: '0 0 20px 0', fontSize: 28, fontWeight: 700, textAlign: 'center' }}>
                О проекте EverestCode
              </h2>
              
              <div style={{ fontSize: 16, lineHeight: 1.8, opacity: 0.95 }}>
                <p style={{ margin: '0 0 16px 0' }}>
                  Этот проект был основан, чтобы помочь широкому спектру людей, начиная от учеников и до профессионалов.
                </p>
                
                <p style={{ margin: '0 0 16px 0' }}>
                  Этот сайт поможет вам лучше разбираться в том, в чем вы слабы, всего лишь задав вопрос AI ассистенту.
                </p>
                
                <p style={{ margin: '0 0 16px 0' }}>
                  <strong style={{ fontWeight: 600 }}>AI ассистент</strong> — это отечественный <strong>GigaChat от Сбербанка</strong>, который поможет вам в разработке, отладке и обучении программированию.
                </p>
                
                <p style={{ margin: '0 0 16px 0' }}>
                  Сайт разрабатывается одним человеком и будет постоянно развиваться. Мы ценим вашу обратную связь!
                </p>
                
                <div style={{ 
                  marginTop: 24, 
                  padding: '16px 20px', 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <p style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: 18 }}>
                    📢 Следите за обновлениями:
                  </p>
                  <p style={{ margin: '0 0 8px 0' }}>
                    Telegram канал: <a 
                      href="https://t.me/everest_ai_code" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#4fc3f7', 
                        textDecoration: 'underline',
                        fontWeight: 600
                      }}
                    >
                      t.me/everest_ai_code
                    </a>
                  </p>
                  <p style={{ margin: 0 }}>
                    Любую критику, недоработки или предложения можете напрямую написать главному разработчику и основателю в Telegram.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <button
                  onClick={() => setIsLearnMoreOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)', 
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: 12, 
                    padding: '12px 24px', 
                    color: '#fff', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    fontSize: 16,
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Понятно
                </button>
              </div>
              <div style={{margin: '18px auto 0', maxWidth: 480, background: 'rgba(18,20,28,0.87)', color: '#fff', textAlign: 'center', fontSize: '12.5px', lineHeight: 1.7, borderRadius: '10px', padding: '13px 9px 11px 9px', fontWeight: 400}}>
  <div style={{fontWeight:600, fontSize:'13px', marginBottom: '2px'}}>Реквизиты</div>
  <b>ИП Пузырёв Ф.А.</b><br/>
  Индивидуальный предприниматель Пузырев Фёдор Александрович<br/>
  ОГРНИП: 324246800149350 | ИНН: 240403456118<br/>
  Email: <a href="mailto:everest124rus@mail.ru" style={{color: '#90e1ff'}}>everest124rus@mail.ru</a><br/>
  Рег. номер оператора по обработке ПДн № 100034113.<br/>
  2024 - 2025
</div>
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};

// Компонент для веб-редактора
const WebCodePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDarkTheme] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'telegram'>('login');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { isAuthenticated, isAdmin, user, token } = useAuth();
  
  // Инициализируем aiMessages и проверяем, нужно ли создать файл
  const [aiMessages, setAiMessages] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp?: number}>>(() => {
    try {
      const saved = localStorage.getItem('aiMessages');
      let arr = saved ? JSON.parse(saved) : [];
      // Если GigaChat не работает, добавляем предупреждение
      if (!arr.length && window.localStorage.getItem('gigachat_error')) {
        arr = [{
          role: 'assistant',
          content: '⚠️ GigaChat временно недоступен. Причина: ошибка подключения к API (400 Bad Request). Используется fallback-режим автоответчика.'
        }];
      }
      return arr;
    } catch {
      return [];
    }
  });
  
  // Инициализируем files с автоматическим созданием txt файла, если есть первое сообщение
  const [files, setFiles] = useState<Record<string, string>>({});
  
  // Инициализируем активный файл и вкладки
  const [activeFile, setActiveFile] = useState<string | null>(null);
  
  const [tabs, setTabs] = useState<FileTab[]>([]);
  
  const [conversations, setConversations] = useState<Array<{id: number, title?: string, messages?: any[]}>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  
  const [allProjectFiles, setAllProjectFiles] = useState([]);
  useEffect(() => {
    fetch('/api/files/list').then(r => r.json()).then(setAllProjectFiles).catch(() => setAllProjectFiles([]));
  }, []);

  async function readFileByPath(path: string): Promise<string> {
    const res = await fetch('/api/files/read?path=' + encodeURIComponent(path));
    const { content } = await res.json();
    return content || '';
  }
  
  // Ref для доступа к методам редактора кода
  const codeEditorRef = useRef<CodeEditorRef>(null);

  // Проверяем наличие первого сообщения и создаем файл при монтировании
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aiMessages');
      const messages = saved ? JSON.parse(saved) as any[] : [];
      const hasIdea = messages.length > 0;
      
      // Если есть сообщения - создаем файл с нейтральным содержимым (БЕЗ текста запроса)
      if (hasIdea) {
        setFiles(prevFiles => {
          // Проверяем, что файл еще не создан
          if (Object.keys(prevFiles).length === 0) {
            const initialPath = 'start.txt';
            // Файл создается с нейтральным содержимым, БЕЗ текста запроса пользователя
            const fileContent = '# Начните работу\n\nСоздайте файлы или начните общение с ИИ ассистентом.\n\nНаписано с любовью в EverestCode.ru';
            
            return { [initialPath]: fileContent };
          }
          return prevFiles;
        });
        
        // Устанавливаем активный файл и вкладки
        setActiveFile('start.txt');
        setTabs([{ id: 'start.txt', name: 'start.txt', path: 'start.txt', isActive: true }]);
      }
    } catch (e) {
      console.error('Error initializing file from aiMessages:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Выполняем только при монтировании
  
  // Синхронизируем activeFile и tabs с files при создании файла из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aiMessages');
    const messages = saved ? JSON.parse(saved) as any[] : [];
    const hasIdea = messages.length > 0;
    
    if (hasIdea && Object.keys(files).length > 0 && !activeFile) {
      const initialPath = 'start.txt';
      if (files[initialPath]) {
        setActiveFile(initialPath);
        setTabs([{ id: initialPath, name: 'start.txt', path: initialPath, isActive: true }]);
      }
    }
  }, [files, activeFile]);

  useEffect(() => {
    localStorage.setItem('aiMessages', JSON.stringify(aiMessages));
  }, [aiMessages]);

  // Load conversations on mount or when auth changes
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const headers = authHeaders(token);
        const res = await fetch(buildApiUrl('/conversations'), { headers });
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          // If no current conversation, try to pick the latest
          if (!currentConversationId && data.length > 0) {
            setCurrentConversationId(data[0].id);
            // Load its messages into panel state только если нет сообщений в localStorage
            const saved = localStorage.getItem('aiMessages');
            const hasLocalMessages = saved ? (JSON.parse(saved) as any[]).length > 0 : false;
            if (!hasLocalMessages && Array.isArray(data[0].messages)) {
              setAiMessages(data[0].messages.filter((m: any) => m.role === 'user' || m.role === 'assistant'));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load conversations', e);
      }
    };
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentConversationId]);

  // Conversation actions
  const createConversation = async (title = 'Новый диалог') => {
    try {
      const headers = authHeaders(token);
      const res = await fetch(buildApiUrl('/conversations'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        const conv = await res.json();
        // Перезагружаем весь список диалогов, чтобы получить актуальные данные
        const convRes = await fetch(buildApiUrl('/conversations'), { headers });
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData);
        }
        setCurrentConversationId(conv.id);
        // Initialize messages from server (may contain assistant title message)
        if (Array.isArray(conv.messages)) {
          setAiMessages(conv.messages.filter((m: any) => m.role === 'user' || m.role === 'assistant'));
        } else {
          setAiMessages([]);
        }
      }
    } catch (e) {
      console.warn('Failed to create conversation', e);
    }
  };

  const handleSelectConversation = async (id: number) => {
    try {
      setCurrentConversationId(id);
      const headers = authHeaders(token);
      const res = await fetch(buildApiUrl(`/conversations/${id}`), { headers });
      if (res.ok) {
        const conv = await res.json();
        if (Array.isArray(conv.messages)) {
          setAiMessages(conv.messages.filter((m: any) => m.role === 'user' || m.role === 'assistant'));
        } else {
          setAiMessages([]);
        }
      }
    } catch (e) {
      console.warn('Failed to select conversation', e);
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      const headers = authHeaders(token);
      const res = await fetch(buildApiUrl(`/conversations/${id}`), { method: 'DELETE', headers });
      if (res.status === 204) {
        // Перезагружаем список диалогов
        const convRes = await fetch(buildApiUrl('/conversations'), { headers });
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData);
        }
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setAiMessages([]);
        }
      }
    } catch (e) {
      console.warn('Failed to delete conversation', e);
    }
  };

  const renameConversation = async (id: number, title: string) => {
    try {
      const headers = authHeaders(token);
      const res = await fetch(buildApiUrl(`/conversations/${id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        // Перезагружаем список диалогов
        const convRes = await fetch(buildApiUrl('/conversations'), { headers });
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData);
        }
      }
    } catch (e) {
      console.warn('Failed to rename conversation', e);
    }
  };

  const currentTheme = isDarkTheme ? darkTheme : lightTheme;

  const handleFileSelect = (filePath: string) => {
    setActiveFile(filePath);
    
    // Добавляем вкладку если её нет
    if (!tabs.find(tab => tab.path === filePath)) {
      const newTab: FileTab = {
        id: filePath,
        name: filePath.split('/').pop() || filePath,
        path: filePath,
        isActive: true
      };
      setTabs(prev => 
        prev.map(tab => ({ ...tab, isActive: false }))
            .concat([newTab])
      );
    } else {
      // Активируем существующую вкладку
      setTabs(prev => 
        prev.map(tab => ({ 
          ...tab, 
          isActive: tab.path === filePath 
        }))
      );
    }
  };

  const handleTabSelect = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveFile(tab.path);
      setTabs(prev => 
        prev.map(t => ({ 
          ...t, 
          isActive: t.id === tabId 
        }))
      );
    }
  };

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setTabs(prev => prev.filter(t => t.id !== tabId));
      
      // Если закрываем активную вкладку, переключаемся на другую
      if (tab.isActive) {
        const remainingTabs = tabs.filter(t => t.id !== tabId);
        if (remainingTabs.length > 0) {
          const newActiveTab = remainingTabs[remainingTabs.length - 1];
          setActiveFile(newActiveTab.path);
          setTabs(prev => 
            prev.map(t => ({ 
              ...t, 
              isActive: t.id === newActiveTab.id 
            }))
          );
        } else {
          setActiveFile(null);
        }
      }
    }
  };

  const handleTabRename = (tabId: string, newName: string) => {
    setTabs(prev => 
      prev.map(tab => 
        tab.id === tabId 
          ? { ...tab, name: newName }
          : tab
      )
    );
  };

  const handleFileContentChange = (content: string) => {
    if (activeFile) {
      setFiles(prev => ({
        ...prev,
        [activeFile]: content
      }));
      
      // Отмечаем вкладку как измененную
      setTabs(prev => 
        prev.map(tab => 
          tab.path === activeFile 
            ? { ...tab, isDirty: true }
            : tab
        )
      );
    }
  };

  const handleFilesAdd = (newFiles: Record<string, string>) => {
    setFiles(prev => ({
      ...prev,
      ...newFiles
    }));
  };

  const handleFileDelete = (filePath: string) => {
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[filePath];
      return newFiles;
    });
    
    // Закрываем вкладку если файл удален
    handleTabClose(filePath);
    
    if (activeFile === filePath) {
      setActiveFile(null);
    }
  };

  const handleCreateFile = (name: string) => {
    const filePath = name.includes('.') ? name : `${name}.txt`;
    setFiles(prev => ({
      ...prev,
      [filePath]: ''
    }));
    handleFileSelect(filePath);
  };

  const handleCreateFolder = (name: string) => {
    // Для папок пока что просто создаем пустой файл с именем папки
    const filePath = `${name}/README.md`;
    setFiles(prev => ({
      ...prev,
      [filePath]: `# ${name}\n\nПапка создана.`
    }));
    handleFileSelect(filePath);
  };

  const handleAIMessage = async (message: string, provider: string = 'gigachat', abortController?: AbortController) => {
    const userTimestamp = Date.now();
    setAiMessages(prev => [...prev, { role: 'user', content: message, timestamp: userTimestamp }]);
    
    try {
      const headers = authHeaders(token);

      // Парсим provider для извлечения модели
      let actualProvider = provider;
      if (provider.includes(':')) {
        const [, modelName] = provider.split(':');
        actualProvider = modelName; // Передаем только название модели
      }

      const response = await fetch(buildApiUrl('/ai/chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          message, 
          provider: actualProvider,
          projectId: null,
          conversationId: currentConversationId
        }),
        signal: abortController?.signal
      });

      if (response.ok) {
        const data = await response.json();
        console.log('AI Response data:', data);
        
        // Проверяем, не был ли запрос прерван
        if (abortController?.signal.aborted) {
          console.log('Запрос был прерван пользователем');
          return;
        }
        
        // Проверяем формат ответа
        if (!data || !data.response) {
          console.error('Неверный формат ответа от сервера:', data);
          const errorTimestamp = Date.now();
          setAiMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Ошибка: получен некорректный ответ от сервера. Попробуйте еще раз.',
            timestamp: errorTimestamp
          }]);
          return;
        }
        
        const responseText = data.response;
        
        // Проверяем, что ответ не пустой и не содержит только ошибку
        if (!responseText || responseText.trim().length === 0) {
          console.error('Пустой ответ от сервера');
          const errorTimestamp = Date.now();
          setAiMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Ошибка: получен пустой ответ от AI. Попробуйте еще раз.',
            timestamp: errorTimestamp
          }]);
          return;
        }
        
        // Проверяем, не был ли запрос прерван перед добавлением ответа
        if (abortController?.signal.aborted) {
          console.log('Запрос был прерван перед добавлением ответа');
          return;
        }
        
        const assistantTimestamp = Date.now();
        setAiMessages(prev => [...prev, { role: 'assistant', content: responseText, timestamp: assistantTimestamp }]);
        
        // Если сервер вернул новый conversationId, обновляем его и перезагружаем список диалогов
        if (data.conversationId && data.conversationId !== currentConversationId) {
          setCurrentConversationId(data.conversationId);
          // Перезагружаем список диалогов
          const headers = authHeaders(token);
          const convRes = await fetch(buildApiUrl('/conversations'), { headers });
          if (convRes.ok) {
            const convData = await convRes.json();
            setConversations(convData);
          }
        }
      } else {
        // Показываем подробную ошибку от сервера
        let errorText = `Ошибка: не удалось получить ответ от AI (статус ${response.status}).`;
        try {
          const data = await response.json();
          console.error('Ошибка от сервера:', data);
          if (data && data.error) {
            errorText = `Ошибка: ${data.error}`;
            if (data.details) {
              errorText += ` (${data.details})`;
            }
          } else if (data && data.message) {
            errorText = `Ошибка: ${data.message}`;
          }
        } catch (e) {
          const text = await response.text();
          console.error('Не удалось распарсить JSON ошибки:', text);
          errorText = `Ошибка сервера (${response.status}): ${text.substring(0, 100)}`;
        }
        // Добавляем контакт разработчика
        const supportSuffix = ' Обратитесь к разработчику: @everestalpine';
        const errorTimestamp = Date.now();
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: `${errorText}${supportSuffix}`,
          timestamp: errorTimestamp
        }]);
      }
    } catch (error: any) {
      // Проверяем, не был ли запрос прерван пользователем
      if (error?.name === 'AbortError' || abortController?.signal.aborted) {
        console.log('Запрос был прерван пользователем');
        // Не добавляем сообщение об ошибке, если запрос был прерван намеренно
        return;
      }
      
      console.error('AI request error:', error);
      const supportSuffix = ' Обратитесь к разработчику: @everestalpine';
      const errorTimestamp = Date.now();
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Извините, произошла ошибка при обращении к AI. Попробуйте еще раз.' + supportSuffix,
        timestamp: errorTimestamp
      }]);
    }
  };

  const handleStopGeneration = () => {
    // Эта функция вызывается из AIPanel при нажатии на кнопку "Стоп"
    // Дополнительная логика остановки может быть добавлена здесь при необходимости
    console.log('Генерация остановлена пользователем');
  };

  const handleInsertCode = (code: string) => {
    if (activeFile && codeEditorRef.current) {
      // Используем метод редактора для вставки кода в позицию курсора
      codeEditorRef.current.insertCodeAtCursor(code);
      
      // Помечаем вкладку как измененную
      setTabs(prev => 
        prev.map(tab => 
          tab.path === activeFile 
            ? { ...tab, isDirty: true }
            : tab
        )
      );
    } else if (activeFile) {
      // Fallback: если редактор еще не готов, добавляем в конец файла
      const currentContent = files[activeFile] || '';
      const newContent = currentContent + '\n\n' + code;
      setFiles(prev => ({
        ...prev,
        [activeFile]: newContent
      }));
      
      // Помечаем вкладку как измененную
      setTabs(prev => 
        prev.map(tab => 
          tab.path === activeFile 
            ? { ...tab, isDirty: true }
            : tab
        )
      );
    }
  };

  // Получаем информацию о текущем файле для AI
  const getCurrentFileInfo = () => {
    if (!activeFile) return undefined;
    
    const content = files[activeFile] || '';
    const language = getLanguageFromExtension(activeFile.split('.').pop() || '');
    const fileName = activeFile.split('/').pop() || activeFile;
    
    return {
      name: fileName,
      content: content,
      language: language
    };
  };

  // Получаем список всех доступных файлов для прикрепления
  const getAvailableFiles = () => {
    return Object.entries(files).map(([path, content]) => {
      const language = getLanguageFromExtension(path.split('.').pop() || '');
      const fileName = path.split('/').pop() || path;
      
      return {
        name: fileName,
        content: content,
        language: language
      };
    });
  };

  if (showAdminPanel && isAdmin) {
    return (
      <ThemeProvider theme={currentTheme}>
        <GlobalStyles />
        <AppContainer>
          <AdminPanel />
        </AppContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyles />
      <AppContainer>
        <PanelGroup direction="horizontal" style={{ width: '100%', height: '100%' }}>
          <Panel defaultSize={15} minSize={10} maxSize={30}>
            <PanelWrapper>
              <Sidebar 
                files={files}
                onFileSelect={handleFileSelect}
                onFilesAdd={handleFilesAdd}
                onFileDelete={handleFileDelete}
                activeFile={activeFile}
                isDarkTheme={isDarkTheme}
                onAuthClick={() => setShowAuthModal(true)}
                onTelegramLoginClick={() => { setAuthModalMode('telegram'); setShowAuthModal(true); }}
                onAdminClick={() => setShowAdminPanel(true)}
                isAuthenticated={isAuthenticated}
                user={user}
                isAdmin={isAdmin}
                token={token}
              />
            </PanelWrapper>
          </Panel>
          <PanelResizeHandle />
          <Panel defaultSize={60} minSize={30}>
            <PanelWrapper>
              <MainContent>
                {Object.keys(files).length === 0 ? (
                  <FileCreator
                    onCreateFile={handleCreateFile}
                    onCreateFolder={handleCreateFolder}
                  />
                ) : (
                  <CodeEditor
                    ref={codeEditorRef}
                    value={activeFile ? files[activeFile] || '' : ''}
                    onChange={handleFileContentChange}
                    language={activeFile ? getLanguageFromExtension(activeFile.split('.').pop() || '') : 'javascript'}
                    theme={isDarkTheme ? 'vs-dark' : 'light'}
                    tabs={tabs}
                    onTabSelect={handleTabSelect}
                    onTabClose={handleTabClose}
                    onTabRename={handleTabRename}
                  />
                )}
              </MainContent>
            </PanelWrapper>
          </Panel>
          <PanelResizeHandle />
          <Panel defaultSize={25} minSize={20} maxSize={40}>
            <PanelWrapper>
              <AIPanel
                messages={aiMessages}
                onSendMessage={handleAIMessage}
                currentFile={getCurrentFileInfo()}
                onInsertCode={handleInsertCode}
                availableFiles={getAvailableFiles()}
                onFilesAdd={handleFilesAdd}
                conversations={conversations}
                currentConversationId={currentConversationId}
                onNewConversation={() => createConversation('Новый диалог')}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={deleteConversation}
                onRenameConversation={renameConversation}
                onStopGeneration={handleStopGeneration}
                allFiles={allProjectFiles}
                onReadFile={readFileByPath}
              />
            </PanelWrapper>
          </Panel>
        </PanelGroup>
        
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => { setShowAuthModal(false); setAuthModalMode('login'); }}
          initialMode={authModalMode}
        />
      </AppContainer>
    </ThemeProvider>
  );
};

const AppContent = () => {
  const { loginWithTelegram } = useAuth();

  useEffect(() => {
    // Обработка результата авторизации через Telegram из hash
    const hash = window.location.hash;
    if (hash.startsWith('#tgAuthResult=')) {
      const tgData = hash.replace('#tgAuthResult=', '');
      
      console.log('Raw hash data:', tgData);
      
      try {
        // Telegram данные могут быть в разных форматах
        // Пробуем сначала декодировать как base64, потом как JSON
        let userData;
        
        try {
          // Пробуем base64 декодирование
          const decoded = atob(tgData);
          userData = JSON.parse(decoded);
        } catch (e1) {
          try {
            // Пробуем обычный декодинг
            const decoded = decodeURIComponent(tgData);
            userData = JSON.parse(decoded);
          } catch (e2) {
            // Если не получается - пробуем как есть
            userData = JSON.parse(tgData);
          }
        }
        
        console.log('Telegram данные получены:', userData);
        
        // Отправляем данные на сервер используя buildApiUrl
        fetch(buildApiUrl('/auth/telegram'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramData: userData }),
        })
        .then(async response => {
          console.log('Response status:', response.status);
          if (!response.ok) {
            // Сначала проверяем статус код и выбрасываем понятную ошибку сразу
            if (response.status === 502) {
              const text = await response.text().catch(() => '');
              console.error('502 Bad Gateway - Server error:', text);
              throw new Error('Сервер временно недоступен (502 Bad Gateway). Пожалуйста, попробуйте позже или обратитесь к разработчику: @EverestAlpine');
            } else if (response.status === 503) {
              throw new Error('Сервис временно недоступен (503 Service Unavailable). Пожалуйста, попробуйте позже.');
            } else if (response.status === 500) {
              throw new Error('Внутренняя ошибка сервера (500). Пожалуйста, обратитесь к разработчику: @EverestAlpine');
            }
            
            // Для других ошибок пытаемся получить текст
            try {
              const text = await response.text();
              console.error('Server error:', text);
              // Если ответ содержит HTML (502 от nginx), показываем понятное сообщение
              if (text.includes('<html>') || text.includes('502') || text.includes('Bad Gateway')) {
                throw new Error('Сервер временно недоступен. Пожалуйста, попробуйте позже или обратитесь к разработчику: @EverestAlpine');
              }
              // Ограничиваем длину сообщения об ошибке
              const errorText = text.length > 200 ? text.substring(0, 200) + '...' : text;
              throw new Error(errorText);
            } catch (textError: any) {
              // Если уже выброшена ошибка выше, пробрасываем её дальше
              if (textError.message && textError.message.includes('Сервер временно недоступен')) {
                throw textError;
              }
              // Иначе пробрасываем общую ошибку
              throw new Error(`Ошибка сервера (${response.status}). Пожалуйста, попробуйте позже или обратитесь к разработчику: @EverestAlpine`);
            }
          }
          return response.json();
        })
        .then(data => {
          console.log('Auth data received:', data);
          if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            loginWithTelegram(data.token, data.user);
            
            // Убираем hash из URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Перезагружаем страницу
            window.location.reload();
          } else {
            throw new Error('Не получен токен авторизации. Пожалуйста, попробуйте еще раз.');
          }
        })
        .catch(error => {
          console.error('Ошибка авторизации через Telegram:', error);
          const errorMessage = error.message || 'Неизвестная ошибка';
          alert(`Ошибка авторизации через Telegram:\n\n${errorMessage}\n\nЕсли проблема повторяется, обратитесь к разработчику: @EverestAlpine`);
        });
      } catch (error: any) {
        console.error('Ошибка парсинга данных Telegram:', error);
        alert('Ошибка парсинга данных: ' + error.message);
      }
    }
  }, [loginWithTelegram]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/webcode" element={<WebCodePage />} />
      <Route path="/files" element={<FileSharingPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;