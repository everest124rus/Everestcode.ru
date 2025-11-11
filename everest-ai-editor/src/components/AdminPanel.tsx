import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  Users, 
  BarChart3, 
  Database, 
  Activity, 
  UserCheck, 
  Crown,
  Calendar,
  Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  subscription_type: string;
  created_at: string;
  last_login: string;
}

interface Statistics {
  total_users: number;
  total_projects: number;
  total_conversations: number;
  active_users: number;
}

const AdminPanelContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.background};
`;

const AdminHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
`;

const AdminTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AdminContent = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatIcon = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: ${props => props.color}20;
  color: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatInfo = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
`;

const UsersTable = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px;
  background-color: ${props => props.theme.colors.background};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  align-items: center;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.background};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RoleBadge = styled.span<{ role: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: ${props => 
    props.role === 'admin' ? props.theme.colors.danger + '20' :
    props.role === 'premium' ? props.theme.colors.warning + '20' :
    props.theme.colors.info + '20'
  };
  color: ${props => 
    props.role === 'admin' ? props.theme.colors.danger :
    props.role === 'premium' ? props.theme.colors.warning :
    props.theme.colors.info
  };
`;

const SubscriptionBadge = styled.span<{ type: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: ${props => 
    props.type === 'premium' ? props.theme.colors.success + '20' :
    props.theme.colors.textSecondary + '20'
  };
  color: ${props => 
    props.type === 'premium' ? props.theme.colors.success :
    props.theme.colors.textSecondary
  };
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.danger};
  text-align: center;
  padding: 20px;
  background-color: ${props => props.theme.colors.danger}10;
  border-radius: 8px;
  margin: 16px 0;
`;

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const API_BASE_URL = buildApiUrl('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [usersResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}admin/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE_URL}admin/statistics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const usersData = await usersResponse.json();
      const statsData = await statsResponse.json();

      setUsers(usersData);
      setStatistics(statsData);
    } catch (err) {
      setError('Ошибка загрузки данных администратора');
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Никогда';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminPanelContainer>
        <AdminHeader>
          <AdminTitle>
            <Crown size={24} />
            Панель администратора
          </AdminTitle>
        </AdminHeader>
        <LoadingSpinner>Загрузка данных...</LoadingSpinner>
      </AdminPanelContainer>
    );
  }

  if (error) {
    return (
      <AdminPanelContainer>
        <AdminHeader>
          <AdminTitle>
            <Crown size={24} />
            Панель администратора
          </AdminTitle>
        </AdminHeader>
        <AdminContent>
          <ErrorMessage>{error}</ErrorMessage>
        </AdminContent>
      </AdminPanelContainer>
    );
  }

  return (
    <AdminPanelContainer>
      <AdminHeader>
        <AdminTitle>
          <Crown size={24} />
          Панель администратора
        </AdminTitle>
      </AdminHeader>

      <AdminContent>
        <Section>
          <SectionTitle>Статистика</SectionTitle>
          <StatsGrid>
            <StatCard>
              <StatIcon color="#007acc">
                <Users size={24} />
              </StatIcon>
              <StatInfo>
                <StatValue>{statistics?.total_users || 0}</StatValue>
                <StatLabel>Всего пользователей</StatLabel>
              </StatInfo>
            </StatCard>

            <StatCard>
              <StatIcon color="#28a745">
                <Activity size={24} />
              </StatIcon>
              <StatInfo>
                <StatValue>{statistics?.active_users || 0}</StatValue>
                <StatLabel>Активных пользователей</StatLabel>
              </StatInfo>
            </StatCard>

            <StatCard>
              <StatIcon color="#ffc107">
                <Database size={24} />
              </StatIcon>
              <StatInfo>
                <StatValue>{statistics?.total_projects || 0}</StatValue>
                <StatLabel>Всего проектов</StatLabel>
              </StatInfo>
            </StatCard>

            <StatCard>
              <StatIcon color="#17a2b8">
                <BarChart3 size={24} />
              </StatIcon>
              <StatInfo>
                <StatValue>{statistics?.total_conversations || 0}</StatValue>
                <StatLabel>AI запросов</StatLabel>
              </StatInfo>
            </StatCard>
          </StatsGrid>
        </Section>

        <Section>
          <SectionTitle>Пользователи</SectionTitle>
          <UsersTable>
            <TableHeader>
              <div>ID</div>
              <div>Имя пользователя</div>
              <div>Email</div>
              <div>Роль</div>
              <div>Подписка</div>
              <div>Последний вход</div>
            </TableHeader>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {user.role === 'admin' ? <Crown size={16} /> : <UserCheck size={16} />}
                    {user.username}
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={16} />
                    {user.email}
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role}>
                    {user.role === 'admin' ? 'Админ' : 'Пользователь'}
                  </RoleBadge>
                </TableCell>
                <TableCell>
                  <SubscriptionBadge type={user.subscription_type}>
                    {user.subscription_type === 'premium' ? 'Премиум' : 'Бесплатная'}
                  </SubscriptionBadge>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} />
                    {formatDate(user.last_login)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </UsersTable>
        </Section>
      </AdminContent>
    </AdminPanelContainer>
  );
};

export default AdminPanel;
