import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl, authHeaders } from '../config/api';
import { MessageSquare, Clock, Zap, TrendingUp, History } from 'lucide-react';

const DashboardContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
`;


const DashboardContent = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
`;

const WelcomeMessage = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(135deg, ${props => props.theme.colors.surface} 0%, ${props => props.theme.colors.background} 100%);
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.surface} 0%, ${props => props.theme.colors.background} 100%);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid ${props => props.theme.colors.border};
  box-shadow: ${props => props.theme.shadows.medium};
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const StatTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: ${props => props.theme.colors.text};
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: ${props => props.theme.colors.text};
`;

const RecentRequests = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  overflow: hidden;
`;

const RequestItem = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const RequestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const RequestProvider = styled.span<{ $provider: string }>`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch(props.$provider) {
      case 'GigaChat-2': return '#e3f2fd';
      case 'GigaChat-2-Pro': return '#f3e5f5';
      case 'GigaChat-2-Max': return '#e8f5e8';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch(props.$provider) {
      case 'GigaChat-2': return '#1976d2';
      case 'GigaChat-2-Pro': return '#7b1fa2';
      case 'GigaChat-2-Max': return '#388e3c';
      default: return '#666';
    }
  }};
`;

const RequestTime = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const RequestMessage = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
  line-height: 1.4;
`;

const RequestTokens = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme.colors.danger};
  color: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

interface UserStats {
  totalRequests: number;
  todayRequests: number;
  weekRequests: number;
  monthRequests: number;
  totalTokens: number;
}

interface RecentRequest {
  id: number;
  message: string;
  response: string;
  provider: string;
  tokensUsed: number;
  createdAt: string;
}

const UserDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = authHeaders(token);
      const response = await fetch(buildApiUrl('/user/stats'), { headers });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentRequests(data.recentRequests);
      } else {
        setError('Ошибка загрузки данных');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token, fetchUserData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingSpinner>Загрузка данных...</LoadingSpinner>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardContent>
        <WelcomeMessage>
          Добро пожаловать, {user?.username}!
        </WelcomeMessage>
        
        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        {stats && (
          <>
            <StatsGrid>
              <StatCard>
                <StatHeader>
                  <StatIcon $color="#2196f3">
                    <MessageSquare size={20} />
                  </StatIcon>
                  <StatTitle>Всего запросов</StatTitle>
                </StatHeader>
                <StatValue>{stats.totalRequests}</StatValue>
                <StatLabel>За все время</StatLabel>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatIcon $color="#4caf50">
                    <Clock size={20} />
                  </StatIcon>
                  <StatTitle>Сегодня</StatTitle>
                </StatHeader>
                <StatValue>{stats.todayRequests}</StatValue>
                <StatLabel>Запросов сегодня</StatLabel>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatIcon $color="#ff9800">
                    <TrendingUp size={20} />
                  </StatIcon>
                  <StatTitle>За неделю</StatTitle>
                </StatHeader>
                <StatValue>{stats.weekRequests}</StatValue>
                <StatLabel>За последние 7 дней</StatLabel>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatIcon $color="#9c27b0">
                    <Zap size={20} />
                  </StatIcon>
                  <StatTitle>Токенов использовано</StatTitle>
                </StatHeader>
                <StatValue>{formatTokens(stats.totalTokens)}</StatValue>
                <StatLabel>Общее количество</StatLabel>
              </StatCard>
            </StatsGrid>

            <Section>
              <SectionTitle>
                <History size={20} style={{ marginRight: '8px', display: 'inline' }} />
                Последние запросы
              </SectionTitle>
              
              <RecentRequests>
                {recentRequests.length > 0 ? (
                  recentRequests.map((request) => (
                    <RequestItem key={request.id}>
                      <RequestHeader>
                        <RequestProvider $provider={request.provider}>
                          {request.provider}
                        </RequestProvider>
                        <RequestTime>{formatDate(request.createdAt)}</RequestTime>
                      </RequestHeader>
                      <RequestMessage>{request.message}</RequestMessage>
                      <RequestTokens>
                        <Zap size={12} />
                        {formatTokens(request.tokensUsed)} токенов
                      </RequestTokens>
                    </RequestItem>
                  ))
                ) : (
                  <RequestItem>
                    <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                      Пока нет запросов к AI
                    </div>
                  </RequestItem>
                )}
              </RecentRequests>
            </Section>
          </>
        )}
      </DashboardContent>
    </DashboardContainer>
  );
};

export default UserDashboard;
