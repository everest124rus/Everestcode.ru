import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const TerminalContainer = styled.div`
  height: 100%;
  width: 100%;
  background-color: ${props => props.theme.colors.terminal};
  position: relative;
  display: flex;
  flex-direction: column;
`;

const TerminalHeader = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  flex-shrink: 0;
`;

const TerminalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
`;

const TerminalStatus = styled.div<{ $connected: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: ${props => props.$connected ? '#22c55e' : '#ef4444'};
  
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: ${props => props.$connected ? '#22c55e' : '#ef4444'};
  }
`;

const TerminalControls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const ControlButton = styled.button`
  padding: 4px 8px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.surface};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TerminalContent = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

interface TerminalProps {
  activeFileName?: string;
}

interface TerminalMessage {
  type: 'output' | 'error' | 'connected' | 'close' | 'ping' | 'pong';
  data: any;
  sessionId: string;
  timestamp: number;
}

export interface TerminalRef {
  clearTerminal: () => void;
  reconnect: () => void;
}

const Terminal = forwardRef<TerminalRef, TerminalProps>(({ activeFileName }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');

  // Инициализация терминала
  const initTerminal = useCallback(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // Создаем экземпляр xterm.js
    const xterm = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: '#3e3e3e',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      fontFamily: '"Cascadia Code", "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      tabStopWidth: 4
    });

    // Создаем аддоны
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    // Подключаем аддоны
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // Открываем терминал в контейнере
    xterm.open(terminalRef.current);

    // Сохраняем ссылки
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Подгоняем размер
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    // Обработка ввода пользователя
    xterm.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });

    // Обработка изменения размера
    xterm.onResize(({ cols, rows }) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          data: { cols, rows }
        }));
      }
    });

    console.log('🖥️ Терминал инициализирован');
  }, []);

  // Подключение к WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) return;

    // Для разработки и тестирования всегда используем localhost:5005
    const isDev = process.env.NODE_ENV === 'development';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    let wsUrl;
    if (isDev || isLocalhost) {
      // Локальная разработка
      wsUrl = `ws://localhost:5005/api/terminal`;
    } else {
      // Production - пытаемся сначала localhost, потом текущий хост
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `ws://localhost:5005/api/terminal`; // Всегда используем localhost для терминала
    }

    console.log('🔍 [FRONTEND] Подключение к WebSocket:', wsUrl);
    console.log('🔍 [FRONTEND] Параметры подключения:', {
      wsUrl,
      currentHost: window.location.host,
      isDev,
      isLocalhost,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Добавляем обработчики сразу после создания
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('🔍 [FRONTEND] WebSocket подключен успешно');
      console.log('🔍 [FRONTEND] WebSocket состояние:', {
        readyState: ws.readyState,
        protocol: ws.protocol,
        extensions: ws.extensions,
        bufferedAmount: ws.bufferedAmount
      });
      
      setIsConnected(true);
      
      // Отправляем ping для поддержания соединения каждые 15 секунд
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log('🔍 [FRONTEND] Отправка ping');
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } else {
          console.log('🔍 [FRONTEND] Ping остановлен, WebSocket не в состоянии OPEN:', ws.readyState);
          clearInterval(pingInterval);
        }
      }, 15000); // каждые 15 секунд
    };

    ws.onmessage = (event) => {
      try {
        const message: TerminalMessage = JSON.parse(event.data);
        
        console.log('🔍 [FRONTEND] Получено сообщение:', {
          type: message.type,
          sessionId: message.sessionId,
          dataSize: typeof message.data === 'string' ? message.data.length : JSON.stringify(message.data).length
        });
        
        switch (message.type) {
          case 'connected':
            console.log('🔍 [FRONTEND] Терминал подключен, данные:', message.data);
            setSessionId(message.data.sessionId);
            setCurrentPath(message.data.cwd);
            if (xtermRef.current) {
              xtermRef.current.write('\r\n\x1b[32m✅ Терминал подключен успешно!\x1b[0m\r\n');
            }
            break;

          case 'output':
            if (xtermRef.current) {
              xtermRef.current.write(message.data);
            }
            break;

          case 'error':
            console.error('🔍 [FRONTEND] Ошибка от сервера:', message.data);
            if (xtermRef.current) {
              xtermRef.current.write(`\x1b[31m${message.data}\x1b[0m`);
            }
            break;

          case 'close':
            console.log('🔍 [FRONTEND] Shell процесс завершен:', message.data);
            if (xtermRef.current) {
              xtermRef.current.write(`\r\n\x1b[33m⚠️ Процесс завершен (код: ${message.data.code})\x1b[0m\r\n`);
            }
            break;

          case 'ping':
            console.log('🔍 [FRONTEND] Получен ping от сервера, отправляем pong');
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          case 'pong':
            console.log('🔍 [FRONTEND] Получен pong от сервера');
            break;

          default:
            console.warn('🔍 [FRONTEND] Неизвестный тип сообщения:', message.type);
        }
      } catch (error) {
        console.error('🔍 [FRONTEND] Ошибка обработки сообщения:', error);
        console.error('🔍 [FRONTEND] Сырые данные сообщения:', event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('🔍 [FRONTEND] WebSocket отключен');
      console.log('🔍 [FRONTEND] Детали отключения:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: new Date().toISOString()
      });
      
      setIsConnected(false);
      setSessionId('');
      wsRef.current = null;
      
      if (xtermRef.current) {
        xtermRef.current.write(`\r\n\x1b[31m❌ Соединение с терминалом потеряно (код: ${event.code})\x1b[0m\r\n`);
      }
      
      // Автоматическое переподключение через 3 секунды
      if (!event.wasClean && event.code !== 1000) {
        console.log('🔍 [FRONTEND] Планируется переподключение через 3 секунды');
        setTimeout(() => {
          console.log('🔍 [FRONTEND] Попытка переподключения');
          connectWebSocket();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('🔍 [FRONTEND] WebSocket ошибка:', error);
      console.error('🔍 [FRONTEND] WebSocket состояние при ошибке:', ws.readyState);
      setIsConnected(false);
      
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\x1b[31m❌ Ошибка подключения к терминалу\x1b[0m\r\n');
      }
    };
  }, []);

  // Переподключение
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setTimeout(connectWebSocket, 1000);
  }, [connectWebSocket]);

  // Очистка терминала
  const clearTerminal = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  }, []);

  // Обработка изменения размера окна
  const handleResize = useCallback(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, []);

  // Эффект инициализации
  useEffect(() => {
    initTerminal();
    connectWebSocket();

    // Обработчик изменения размера окна
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Закрываем WebSocket
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Очищаем терминал
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [initTerminal, connectWebSocket, handleResize]);

  // Эффект для подгонки размера при изменении активного файла
  useEffect(() => {
    handleResize();
  }, [activeFileName, handleResize]);

  // Экспортируем методы через ref
  useImperativeHandle(ref, () => ({
    clearTerminal,
    reconnect
  }), [clearTerminal, reconnect]);

  return (
    <TerminalContainer>
      <TerminalHeader>
        <TerminalTitle>
          🖥️ Терминал
          {sessionId && (
            <span style={{ fontSize: '10px', opacity: 0.7 }}>
              ({sessionId.slice(-6)})
            </span>
          )}
        </TerminalTitle>
        
        <TerminalControls>
          <TerminalStatus $connected={isConnected}>
            {isConnected ? 'Подключен' : 'Отключен'}
          </TerminalStatus>
          
          <ControlButton onClick={clearTerminal} disabled={!isConnected}>
            Очистить
          </ControlButton>
          
          <ControlButton onClick={reconnect} disabled={isConnected}>
            Переподключить
          </ControlButton>
        </TerminalControls>
      </TerminalHeader>
      
      <TerminalContent ref={terminalRef} />
    </TerminalContainer>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;