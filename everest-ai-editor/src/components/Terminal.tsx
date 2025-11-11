import React, { useEffect, useRef } from 'react';
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
`;

const TerminalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
`;

const TerminalControls = styled.div`
  display: flex;
  gap: 8px;
`;

const ControlButton = styled.button`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.7;
  }

  &:nth-child(1) {
    background-color: #ff5f56;
  }

  &:nth-child(2) {
    background-color: #ffbd2e;
  }

  &:nth-child(3) {
    background-color: #27ca3f;
  }
`;

const TerminalContent = styled.div`
  height: calc(100% - 40px);
  padding: 8px;
`;

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    let terminal: XTerm | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeTimeout: NodeJS.Timeout;
    let resizeObserver: ResizeObserver | null = null;

    // Объявляем функцию fitTerminal с защитой
    const fitTerminal = () => {
      try {
        if (fitAddon && terminal) {
          fitAddon.fit();
        }
      } catch (error) {
        console.warn('Ошибка при изменении размера терминала:', error);
        // Повторная попытка через некоторое время
        setTimeout(fitTerminal, 100);
      }
    };

    // Функция для обработки изменения размера окна
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(fitTerminal, 100);
    };

    try {
      // Create terminal instance
      terminal = new XTerm({
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#cccccc',
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
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace",
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        tabStopWidth: 4,
      });

      // Add addons
      fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // Open terminal
      terminal.open(terminalRef.current);

      // Ждем пока терминал полностью инициализируется
      setTimeout(() => {
        try {
          fitTerminal();

          // Настройка ResizeObserver для контейнера
          if (terminalRef.current) {
            resizeObserver = new ResizeObserver(() => {
              if (resizeTimeout) clearTimeout(resizeTimeout);
              resizeTimeout = setTimeout(fitTerminal, 100);
            });

            resizeObserver.observe(terminalRef.current);
          }
        } catch (error) {
          console.error('Ошибка инициализации терминала:', error);
        }
      }, 100);

      // Welcome message
      terminal.writeln('Добро пожаловать в Everest AI Editor!');
      terminal.writeln('Введите команду для начала работы...');
      terminal.writeln('');

      // Input handling
      let currentLine = '';
      terminal.onData((data) => {
        const code = data.charCodeAt(0);
        
        if (code === 13) { // Enter
          terminal?.writeln('');
          handleCommand(currentLine.trim());
          currentLine = '';
          terminal?.write('$ ');
        } else if (code === 127) { // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            terminal?.write('\b \b');
          }
        } else if (code >= 32) { // Printable characters
          currentLine += data;
          terminal?.write(data);
        }
      });

      // Command handling
      const handleCommand = (command: string) => {
        if (!terminal) return;
        
        if (!command) {
          terminal.write('$ ');
          return;
        }

        const [cmd, ...args] = command.split(' ');

        switch (cmd.toLowerCase()) {
          case 'help':
            terminal.writeln('Доступные команды:');
            terminal.writeln('  help     - показать эту справку');
            terminal.writeln('  clear    - очистить терминал');
            terminal.writeln('  ls       - список файлов');
            terminal.writeln('  pwd      - текущая директория');
            terminal.writeln('  echo     - вывести текст');
            terminal.writeln('  version  - версия редактора');
            break;

          case 'clear':
            terminal.clear();
            break;

          case 'ls':
            terminal.writeln('Файлы в проекте:');
            terminal.writeln('  src/');
            terminal.writeln('  public/');
            terminal.writeln('  package.json');
            terminal.writeln('  README.md');
            break;

          case 'pwd':
            terminal.writeln('/everest-ai-editor');
            break;

          case 'echo':
            terminal.writeln(args.join(' '));
            break;

          case 'version':
            terminal.writeln('Everest AI Editor v1.0.0');
            terminal.writeln('React 19.1.1');
            terminal.writeln('Monaco Editor');
            break;

          default:
            terminal.writeln(`Команда "${command}" не найдена. Введите "help" для справки.`);
        }

        terminal.write('$ ');
      };

      // Initial prompt
      terminal.write('$ ');
      xtermRef.current = terminal;

      // Add event listeners - handleResize is now in the outer scope
      window.addEventListener('resize', handleResize);
      
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
    }

    // Cleanup function
    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);

      // Отключаем ResizeObserver
      const currentRef = terminalRef.current;
      if (resizeObserver && currentRef) {
        try {
          resizeObserver.unobserve(currentRef);
        } catch (error) {
          console.warn('Ошибка отключения ResizeObserver:', error);
        }
      }

      try {
        if (terminal) {
          terminal.dispose();
        }
      } catch (error) {
        console.warn('Error disposing terminal:', error);
      }
    };
  }, []);

  return (
    <TerminalContainer>
      <TerminalHeader>
        <TerminalTitle>Терминал</TerminalTitle>
        <TerminalControls>
          <ControlButton />
          <ControlButton />
          <ControlButton />
        </TerminalControls>
      </TerminalHeader>
      <TerminalContent ref={terminalRef} />
    </TerminalContainer>
  );
};

export default Terminal;
