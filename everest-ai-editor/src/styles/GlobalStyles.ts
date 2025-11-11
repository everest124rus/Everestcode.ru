import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
  }

  #root {
    height: 100vh;
    width: 100vw;
  }

  /* Scrollbar styles */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.surface};
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.textSecondary};
  }

  /* Monaco Editor custom styles */
  .monaco-editor {
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace !important;
  }

  /* Resize handle styles */
  [data-panel-resize-handle] {
    background: ${props => props.theme.colors.border};
    transition: background-color 0.2s ease;
  }

  [data-panel-resize-handle]:hover {
    background: ${props => props.theme.colors.primary};
  }

  [data-panel-resize-handle][data-panel-group-direction="horizontal"] {
    width: 4px;
    cursor: col-resize;
  }

  [data-panel-resize-handle][data-panel-group-direction="vertical"] {
    height: 4px;
    cursor: row-resize;
  }
`;
