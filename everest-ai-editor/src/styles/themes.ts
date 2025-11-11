export const lightTheme = {
  colors: {
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    primary: '#007bff',
    primaryHover: '#0056b3',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    sidebar: '#f1f3f4',
    editor: '#f5f5f5',
    terminal: '#1e1e1e',
    terminalText: '#ffffff',
    aiPanel: '#f8f9fa',
    aiMessage: '#e9ecef',
    aiUserMessage: '#007bff',
    aiUserMessageText: '#ffffff'
  },
  shadows: {
    small: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    medium: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    large: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)'
  }
};

export const darkTheme = {
  colors: {
    background: '#1e1e1e',
    surface: '#252526',
    text: '#cccccc',
    textSecondary: '#969696',
    border: '#3e3e42',
    primary: '#007acc',
    primaryHover: '#005a9e',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    sidebar: '#2d2d30',
    editor: '#1e1e1e',
    terminal: '#1e1e1e',
    terminalText: '#cccccc',
    aiPanel: '#252526',
    aiMessage: '#3e3e42',
    aiUserMessage: '#007acc',
    aiUserMessageText: '#ffffff'
  },
  shadows: {
    small: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)',
    medium: '0 3px 6px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.5)',
    large: '0 10px 20px rgba(0,0,0,0.5), 0 6px 6px rgba(0,0,0,0.6)'
  }
};

export type Theme = typeof lightTheme;
