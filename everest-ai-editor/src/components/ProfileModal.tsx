import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { X, User, Calendar, BarChart3, Crown, Upload, Save, Copy, Check, HelpCircle } from 'lucide-react';
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

interface Referral {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  telegramUsername?: string;
  displayName: string;
  registeredAt: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user: authUser, token, isPremium } = useAuth();
  const [user, setUser] = useState(authUser);
  const [stats, setStats] = useState<UserStats>({
    totalRequests: 0,
    todayRequests: 0,
    weekRequests: 0,
    monthRequests: 0,
    totalTokens: 0,
    recentRequests: []
  });
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReferralTooltip, setShowReferralTooltip] = useState(false);

  useEffect(() => {
    setUser(authUser);
  }, [authUser]);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const fetchUserStats = async () => {
    if (!token) {
      console.warn('Нет токена для загрузки статистики');
      return;
    }
    
    setIsLoading(true);
    try {
      // Загружаем профиль пользователя (включая referralCode)
      const profileResponse = await fetch(buildApiUrl('/user/profile'), {
        headers: authHeaders(token)
      });
      
      // Загружаем статистику
      const statsResponse = await fetch(buildApiUrl('/user/stats'), {
        headers: authHeaders(token)
      });
      
      // Загружаем лимиты
      const limitsResponse = await fetch(buildApiUrl('/user/limits'), {
        headers: authHeaders(token)
      });
      
      // Загружаем список рефералов
      const referralsResponse = await fetch(buildApiUrl('/user/referrals'), {
        headers: authHeaders(token)
      });
      
      console.log('Ответы API:', {
        profile: profileResponse.status,
        stats: statsResponse.status,
        limits: limitsResponse.status,
        referrals: referralsResponse.status
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.user) {
          setUser(prevUser => {
            const updatedUser = {
              ...prevUser,
              ...profileData.user
            };
            // Обновляем localStorage
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
          });
        }
      }
      
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
        console.log('Лимиты загружены:', limitsData);
        setLimits(limitsData);
      } else {
        const errorData = await limitsResponse.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        console.error('Ошибка загрузки лимитов:', limitsResponse.status, errorData);
      }
      
      if (referralsResponse.ok) {
        const referralsData = await referralsResponse.json();
        setReferrals(referralsData.referrals || []);
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
        const data = await response.json();
        // Обновляем аватар в контексте
        if (data.avatarUrl && user) {
          const updatedUser = { ...user, avatarUrl: data.avatarUrl };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.location.reload(); // Простое обновление для демонстрации
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
    }
  };

  const handleCopyReferralCode = async () => {
    if (user?.referralCode) {
      try {
        await navigator.clipboard.writeText(user.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Ошибка копирования:', error);
      }
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
              Object.entries(limits.models).map(([key, model]) => {
                // Маппинг правильных названий моделей
                const modelNames: { [key: string]: string } = {
                  'gigachat': 'GigaChat Lite',
                  'gigachat-2': 'GigaChat Pro',
                  'gigachat-3': 'GigaChat MAX'
                };
                const displayName = modelNames[key] || model.name;
                
                return (
                  <ModelItem key={key}>
                    <ModelName>{displayName}</ModelName>
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
                );
              })
            ) : (
              <div style={{ color: '#666', fontSize: '14px' }}>
                Загрузка лимитов...
              </div>
            )}
          </ModelsList>
        </ModelsSection>

        {user?.referralCode && (
          <ModelsSection>
            <SectionTitle>
              <User size={18} />
              Реферальный код
              <div style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
                <HelpCircle 
                  size={16} 
                  style={{ 
                    cursor: 'pointer', 
                    color: '#999',
                    verticalAlign: 'middle'
                  }}
                  onMouseEnter={() => setShowReferralTooltip(true)}
                  onMouseLeave={() => setShowReferralTooltip(false)}
                />
                {showReferralTooltip && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    background: '#1a1a1a',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    width: '280px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      Что такое реферальный код?
                    </div>
                    <div style={{ lineHeight: '1.6', marginBottom: '8px' }}>
                      Поделитесь своим реферальным кодом с друзьями. Когда они зарегистрируются по вашему коду, они получат бонусные токены:
                    </div>
                    <div style={{ lineHeight: '1.6', fontSize: '11px', color: '#aaa' }}>
                      • +10 токенов на GigaChat Lite<br/>
                      • +50 токенов на GigaChat Pro<br/>
                      • +5 токенов на GigaChat MAX
                    </div>
                  </div>
                )}
              </div>
            </SectionTitle>
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Ваш реферальный код
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#3b82f6',
                  fontFamily: 'monospace',
                  letterSpacing: '2px'
                }}>
                  {user.referralCode}
                </div>
              </div>
              <button
                onClick={handleCopyReferralCode}
                style={{
                  background: copied ? '#28a745' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Копировать
                  </>
                )}
              </button>
            </div>
          </ModelsSection>
        )}

        {referrals.length > 0 && (
          <ModelsSection>
            <SectionTitle>
              <User size={18} />
              Мои рефералы ({referrals.length})
            </SectionTitle>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: referral.avatarUrl
                      ? `url(${referral.avatarUrl}) center/cover`
                      : `linear-gradient(135deg, #3b82f6, #8b5cf6)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'white',
                    flexShrink: 0
                  }}>
                    {!referral.avatarUrl && (
                      <span>
                        {referral.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#fff',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {referral.displayName}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#999',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {referral.username || referral.email || 'Пользователь'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    whiteSpace: 'nowrap'
                  }}>
                    {new Date(referral.registeredAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ModelsSection>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default ProfileModal;
