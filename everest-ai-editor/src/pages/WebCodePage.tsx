import React, { useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { lightTheme, darkTheme } from '../styles/themes';
import { GlobalStyles } from '../styles/GlobalStyles';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
  overflow: hidden;
`;

const Header = styled.div`
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
  color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const ActionButton = styled.button`
  background: ${props => props.theme.colors.primary};
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.theme.colors.primaryHover};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ThemeToggle = styled.button`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  padding: 8px 16px;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.theme.colors.border};
  }
`;

const WebCodePage: React.FC = () => {
  const navigate = useNavigate();
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const currentTheme = isDarkTheme ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDarkTheme(prev => !prev);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyles />
      <AppContainer>
        <Header>
          <div>
            <strong>Everest Code</strong> - Веб-редактор
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ThemeToggle onClick={toggleTheme}>
              {isDarkTheme ? '☀️' : '🌙'} {isDarkTheme ? 'Светлая' : 'Темная'}
            </ThemeToggle>
            <ActionButton onClick={handleGoHome}>
              🏠 На главную
            </ActionButton>
          </div>
        </Header>

        <Content>
          <Title>Веб-редактор</Title>
          <Subtitle>
            Добро пожаловать в веб-редактор Everest Code!<br />
            Здесь будет полнофункциональный редактор кода с поддержкой ИИ.
          </Subtitle>
          
          <ButtonGroup>
            <ActionButton onClick={() => alert('Функция в разработке')}>
              📝 Создать файл
            </ActionButton>
            <ActionButton onClick={() => alert('Функция в разработке')}>
              🤖 ИИ помощник
            </ActionButton>
            <ActionButton onClick={() => alert('Функция в разработке')}>
              💻 Терминал
            </ActionButton>
          </ButtonGroup>
        </Content>
      </AppContainer>
    </ThemeProvider>
  );
};

export default WebCodePage;