import React, { useRef, useEffect, useLayoutEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Editor } from '@monaco-editor/react';
import styled from 'styled-components';
import { editor, Range } from 'monaco-editor';
import FileTabs from './FileTabs';

interface FileTab {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  isDirty?: boolean;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme: string;
  tabs: FileTab[];
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabRename: (tabId: string, newName: string) => void;
}

export interface CodeEditorRef {
  insertCodeAtCursor: (code: string) => void;
}

const EditorContainer = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
`;

const EditorHeader = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const EditorContent = styled.div`
  height: calc(100% - 40px);
  display: flex;
  flex-direction: column;
`;

const EditorStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatusItem = styled.span`
  font-size: 11px;
`;

const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({
  value,
  onChange,
  language,
  theme,
  tabs,
  onTabSelect,
  onTabClose,
  onTabRename
}, ref) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerReady, setContainerReady] = useState(false);

  // Экспортируем метод для вставки кода в позицию курсора
  useImperativeHandle(ref, () => ({
    insertCodeAtCursor: (code: string) => {
      if (editorRef.current) {
        const editorInstance = editorRef.current;
        const selection = editorInstance.getSelection();
        const position = editorInstance.getPosition();
        
        if (selection && position) {
          // Проверяем, есть ли выделение (start !== end)
          const hasSelection = !selection.isEmpty();
          
          if (hasSelection) {
            // Если есть выделение, заменяем его
            const range = new Range(
              selection.startLineNumber,
              selection.startColumn,
              selection.endLineNumber,
              selection.endColumn
            );
            
            editorInstance.executeEdits('insert-code', [{
              range: range,
              text: code,
              forceMoveMarkers: true
            }]);
          } else {
            // Если нет выделения, вставляем в позицию курсора
            const range = new Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            );
            
            editorInstance.executeEdits('insert-code', [{
              range: range,
              text: code,
              forceMoveMarkers: true
            }]);
          }
          
          // Получаем обновленное содержимое после вставки
          const updatedContent = editorInstance.getModel()?.getValue() || '';
          
          // Синхронизируем с родительским компонентом через onChange
          if (updatedContent !== value) {
            onChange(updatedContent);
          }
          
          // Устанавливаем курсор после вставленного кода
          const lineCount = code.split('\n').length;
          const lastLine = code.split('\n')[lineCount - 1];
          const newColumn = lastLine.length + 1;
          const startLine = selection?.startLineNumber || position?.lineNumber || 1;
          const newLineNumber = startLine + lineCount - 1;
          
          editorInstance.setPosition({
            lineNumber: newLineNumber,
            column: newColumn
          });
          
          // Фокусируем редактор
          editorInstance.focus();
        } else {
          // Fallback: если нет выделения и позиции, вставляем в конец файла
          const model = editorInstance.getModel();
          if (model) {
            const lineCount = model.getLineCount();
            const lastLineLength = model.getLineLength(lineCount);
            
            const range = new Range(
              lineCount,
              lastLineLength + 1,
              lineCount,
              lastLineLength + 1
            );
            
            editorInstance.executeEdits('insert-code', [{
              range: range,
              text: '\n' + code,
              forceMoveMarkers: true
            }]);
            
            // Синхронизируем с родительским компонентом через onChange
            const updatedContent = editorInstance.getModel()?.getValue() || '';
            if (updatedContent !== value) {
              onChange(updatedContent);
            }
            
            editorInstance.focus();
          }
        }
      }
    }
  }));

  useLayoutEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerReady(rect.width > 50 && rect.height > 50);
      }
    }
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Принудительно вызываем layout, когда контейнер становится валидным
  useEffect(() => {
    if (containerReady && editorRef.current) {
      window.requestAnimationFrame(() => {
        editorRef.current && editorRef.current.layout();
      });
    }
  }, [containerReady]);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Проверяем, что DOM node существует и имеет размеры
    const checkAndLayout = () => {
      if (editorRef.current) {
        const domNode = editorRef.current.getDomNode();
        if (domNode && domNode.offsetWidth > 0 && domNode.offsetHeight > 0) {
          try {
            editorRef.current.layout();
            return true;
          } catch (error) {
            console.warn('Monaco Editor layout error:', error);
            return false;
          }
        }
      }
      return false;
    };

    // Ждем пока контейнер будет готов
    const waitForContainer = () => {
      if (checkAndLayout()) return;

      let attempts = 0;
      const maxAttempts = 50; // 5 секунд максимум

      const attemptLayout = () => {
        attempts++;
        if (checkAndLayout() || attempts >= maxAttempts) {
          return;
        }
        setTimeout(attemptLayout, 100);
      };

      setTimeout(attemptLayout, 100);
    };

    // Запускаем проверку через небольшую задержку
    setTimeout(waitForContainer, 50);

    // Настройка горячих клавиш
    editor.addCommand(1 | 2, () => {
      console.log('Save file');
    });

    editor.addCommand(1 | 3, () => {
      editor.getAction('actions.find')?.run();
    });

    editor.addCommand(1 | 4, () => {
      editor.getAction('editor.action.startFindReplaceAction')?.run();
    });

    // Настройка автодополнения и оптимизация для больших файлов
    const model = editor.getModel();
    const lineCount = model?.getLineCount() || 0;
    const isLargeFile = lineCount > 2000;
    
    editor.updateOptions({
      minimap: { enabled: !isLargeFile }, // Отключаем minimap для больших файлов
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 1.5,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace",
      wordWrap: 'on',
      automaticLayout: false, // Отключаем automaticLayout для избежания конфликтов с панелями
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: isLargeFile ? 'none' : 'selection',
      renderLineHighlight: isLargeFile ? 'none' : 'line',
      cursorStyle: 'line',
      cursorBlinking: 'blink',
      smoothScrolling: !isLargeFile, // Отключаем плавную прокрутку для больших файлов
      mouseWheelZoom: !isLargeFile,
      contextmenu: true,
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorWidth: 1,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      unfoldOnClickAfterEndOfLine: false,
      bracketPairColorization: {
        enabled: !isLargeFile // Отключаем для больших файлов
      },
      guides: {
        bracketPairs: !isLargeFile,
        indentation: !isLargeFile
      },
      occurrencesHighlight: isLargeFile ? 'off' : 'singleFile',
      selectionHighlight: !isLargeFile,
      renderValidationDecorations: isLargeFile ? 'off' : 'on',
      quickSuggestions: isLargeFile ? false : {
        other: true,
        comments: false,
        strings: false
      },
      suggestOnTriggerCharacters: !isLargeFile
    });

    // Добавляем обработчик изменения размера для ручного обновления layout
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          window.requestAnimationFrame(() => {
            if (editorRef.current) {
              const domNode = editorRef.current.getDomNode();
              if (domNode && domNode.offsetWidth > 0 && domNode.offsetHeight > 0) {
                try {
                  editorRef.current.layout();
                } catch (error) {
                  console.warn('Monaco Editor layout error:', error);
                }
              }
            }
          });
        }
      }
    });

    const editorElement = editor.getDomNode();
    if (editorElement) {
      resizeObserver.observe(editorElement);
    }

    // Обработчик изменения видимости
    const handleVisibilityChange = () => {
      if (!document.hidden && editorRef.current) {
        setTimeout(() => {
          if (editorRef.current) {
            const domNode = editorRef.current.getDomNode();
            if (domNode && domNode.offsetWidth > 0 && domNode.offsetHeight > 0) {
              try {
                editorRef.current.layout();
              } catch (error) {
                console.warn('Monaco Editor layout error on visibility change:', error);
              }
            }
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup функция
    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  };

  // Debounce для onChange - предотвращает лаги при быстром наборе
  const onChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      // Очищаем предыдущий таймер
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }
      
      // Для маленьких файлов (< 1000 строк) обновляем сразу
      // Для больших файлов используем debounce 300ms
      const lineCount = value.split('\n').length;
      const delay = lineCount > 1000 ? 300 : 0;
      
      if (delay > 0) {
        onChangeTimeoutRef.current = setTimeout(() => {
          onChange(value);
        }, delay);
      } else {
        onChange(value);
      }
    }
  };
  
  // Cleanup debounce timeout при размонтировании
  useEffect(() => {
    return () => {
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <EditorContainer ref={containerRef}>
      <EditorContent>
        {tabs.length > 0 && (
          <FileTabs
            tabs={tabs}
            onTabSelect={onTabSelect}
            onTabClose={onTabClose}
            onTabRename={onTabRename}
          />
        )}
        <EditorHeader>
          <div></div>
          <EditorStatus>
            <StatusItem>Ln 1, Col 1</StatusItem>
            <StatusItem>{language.toUpperCase()}</StatusItem>
            <StatusItem>UTF-8</StatusItem>
            <StatusItem>LF</StatusItem>
          </EditorStatus>
        </EditorHeader>
        {containerReady && (() => {
          // Определяем размер файла для оптимизации
          const lineCount = value.split('\n').length;
          const isLargeFile = lineCount > 2000; // Файлы больше 2000 строк считаем большими
          
          return (
            <Editor
              height="calc(100% - 80px)"
              language={language}
              value={value}
              theme={theme}
              onMount={handleEditorDidMount}
              onChange={handleEditorChange}
              options={{
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: false,
                cursorStyle: 'line',
                automaticLayout: false, // Отключаем automaticLayout
                // Отключаем minimap для больших файлов - это значительно улучшает производительность
                minimap: { enabled: !isLargeFile },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineHeight: 1.5,
                fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace",
                wordWrap: 'on',
                tabSize: 2,
                insertSpaces: true,
                renderWhitespace: isLargeFile ? 'none' : 'selection', // Отключаем отображение пробелов для больших файлов
                renderLineHighlight: isLargeFile ? 'none' : 'line', // Отключаем подсветку строки для больших файлов
                cursorBlinking: 'blink',
                smoothScrolling: !isLargeFile, // Отключаем плавную прокрутку для больших файлов
                mouseWheelZoom: !isLargeFile, // Отключаем зум колесиком для больших файлов
                contextmenu: true,
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'always',
                unfoldOnClickAfterEndOfLine: false,
                // Отключаем bracket pair colorization для больших файлов - это тяжелая операция
                bracketPairColorization: {
                  enabled: !isLargeFile
                },
                guides: {
                  bracketPairs: !isLargeFile, // Отключаем для больших файлов
                  indentation: !isLargeFile // Отключаем для больших файлов
                },
                // Оптимизация прокрутки
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  useShadows: !isLargeFile, // Отключаем тени для больших файлов
                  verticalScrollbarSize: isLargeFile ? 10 : 14,
                  horizontalScrollbarSize: isLargeFile ? 10 : 14
                },
                // Оптимизация рендеринга
                renderValidationDecorations: isLargeFile ? 'off' : 'on',
                occurrencesHighlight: isLargeFile ? 'off' : 'singleFile', // Отключаем подсветку вхождений для больших файлов
                selectionHighlight: !isLargeFile, // Отключаем подсветку выделения для больших файлов
                // Оптимизация автодополнения для больших файлов
                quickSuggestions: isLargeFile ? false : {
                  other: true,
                  comments: false,
                  strings: false
                },
                suggestOnTriggerCharacters: !isLargeFile,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on'
              }}
            />
          );
        })()}
      </EditorContent>
    </EditorContainer>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
