import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { X, User, Calendar, BarChart3, Crown, Upload, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl, authHeaders } from '../config/api';

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border-radius: 12px;
  padding: 24px;
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.border};
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const AvatarContainer = styled.div`
  position: relative;
`;

const Avatar = styled.div<{ $avatarUrl?: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.$avatarUrl 
    ? `url(${props.$avatarUrl}) center/cover` 
    : `linear-gradient(135deg, ${props.theme.colors.primary}, ${props.theme.colors.primaryHover})`
  };
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: white;
  border: 3px solid ${props => props.theme.colors.border};
`;

const ProBadge = styled.div`
  position: absolute;
  top: -4px;
  right: -4px;
  background: linear-gradient(45deg, #FFD700, #FFA500);
  color: #000;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 2px;
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: white !important;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProfileEmail = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 4px;
`;

const AvatarUpload = styled.div`
  margin-top: 8px;
`;

const UploadButton = styled.button`
  background: none;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.border};
  }
`;

const StatsSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: bold;
  color: white !important;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 16px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ModelsSection = styled.div`
  margin-bottom: 24px;
`;

const ModelsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ModelTag = styled.div<{ $color: string }>`
  background-color: ${props => props.$color}20;
  color: ${props => props.$color};
  border: 1px solid ${props => props.$color}40;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
`;

const ModelItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
`;

const ModelName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const ModelCount = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  text-align: right;
`;

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserStats {
  totalRequests: number;
  todayRequests: number;
  weekRequests: number;
  monthRequests: number;
  totalTokens: number;
  recentRequests: Array<{
    id: string;
    message: string;
    response: string;
    provider: string;
    tokensUsed: number;
    createdAt: string;
  }>;
}

interface UserLimits {
  subscription: {
    has_subscription: boolean;
    type: string;
  };
  models: {
    [key: string]: {
      name: string;
      total: number;
      used: number;
      remaining: number;
      unlimited: boolean;
    };
  };
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, token, isPremium } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalRequests: 0,
    todayRequests: 0,
    weekRequests: 0,
    monthRequests: 0,
    totalTokens: 0,
    recentRequests: []
  });
  const [limits, setLimits] = useState<UserLimits | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const fetchUserStats = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      // Загружаем статистику
      const statsResponse = await fetch(buildApiUrl('/user/stats'), {
        headers: authHeaders(token)
      });
      
      // Загружаем лимиты
      const limitsResponse = await fetch(buildApiUrl('/user/limits'), {
        headers: authHeaders(token)
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalRequests: statsData.stats?.totalRequests || 0,
          todayRequests: statsData.stats?.todayRequests || 0,
          weekRequests: statsData.stats?.weekRequests || 0,
          monthRequests: statsData.stats?.monthRequests || 0,
          totalTokens: statsData.stats?.totalTokens || 0,
          recentRequests: statsData.recentRequests || []
        });
      }
      
      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        setLimits(limitsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(buildApiUrl('/user/avatar'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        // Обновляем аватар в контексте
        window.location.reload(); // Простое обновление для демонстрации
      }
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getModelColor = (modelName: string): string => {
    if (modelName.includes('Lite')) return '#CD7F32'; // bronze
    if (modelName.includes('Pro')) return '#C0C0C0'; // silver
    if (modelName.includes('Max')) return '#FFD700'; // gold
    return '#007acc';
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay $isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>

        <ProfileHeader>
          <AvatarContainer>
            <Avatar $avatarUrl={user?.avatarUrl}>
              {!user?.avatarUrl && user?.username?.charAt(0).toUpperCase()}
            </Avatar>
            {isPremium && (
              <ProBadge>
                <Crown size={10} />
                PRO
              </ProBadge>
            )}
          </AvatarContainer>
          
          <ProfileInfo>
            <ProfileName>
              {user?.username}
              {isPremium && (
                <ProBadge>
                  <Crown size={12} />
                  PRO
                </ProBadge>
              )}
            </ProfileName>
            <ProfileEmail>{user?.email}</ProfileEmail>
            
            <AvatarUpload>
              <UploadButton as="label" htmlFor="avatar-upload">
                <Upload size={12} />
                Изменить аватар
              </UploadButton>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            </AvatarUpload>
          </ProfileInfo>
        </ProfileHeader>

        <StatsSection>
          <SectionTitle>
            <BarChart3 size={18} />
            Статистика запросов
          </SectionTitle>
          
          <StatsGrid>
            <StatCard>
              <StatValue>{stats.todayRequests}</StatValue>
              <StatLabel>Сегодня</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.weekRequests}</StatValue>
              <StatLabel>За неделю</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.monthRequests}</StatValue>
              <StatLabel>За месяц</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.totalRequests}</StatValue>
              <StatLabel>Всего</StatLabel>
            </StatCard>
          </StatsGrid>
        </StatsSection>

        <ModelsSection>
          <SectionTitle>
            <Calendar size={18} />
            Лимиты по тарифам
          </SectionTitle>
          
          <ModelsList>
            {limits ? (
              Object.entries(limits.models).map(([key, model]) => (
                <ModelItem key={key}>
                  <ModelName>{model.name}</ModelName>
                  <ModelCount>
                    {model.unlimited ? (
                      <span style={{ color: '#28a745' }}>∞ неограниченно</span>
                    ) : (
                      <span>
                        {model.used} / {model.total} запросов
                        <div style={{ 
                          fontSize: '12px', 
                          color: model.remaining > 0 ? '#28a745' : '#dc3545',
                          marginTop: '2px'
                        }}>
                          Осталось: {model.remaining}
                        </div>
                      </span>
                    )}
                  </ModelCount>
                </ModelItem>
              ))
            ) : (
              <div style={{ color: '#666', fontSize: '14px' }}>
                Загрузка лимитов...
              </div>
            )}
          </ModelsList>
        </ModelsSection>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ProfileModal;
