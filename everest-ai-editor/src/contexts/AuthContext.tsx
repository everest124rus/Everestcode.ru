import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { buildApiUrl } from '../config/api';

export interface User {
  id: number;
  email?: string;
  username: string;
  role: 'admin' | 'user';
  subscription_type?: 'free' | 'premium';
  avatarUrl?: string;
  telegramId?: string;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  referralCode?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string, referralCode?: string) => Promise<string | true>;
  loginWithTelegram: (token: string, user: any) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to load user from localStorage first
  const savedUser = localStorage.getItem('user');
  const [user, setUser] = useState<User | null>(savedUser ? JSON.parse(savedUser) : null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token && !user) {
      // Verify token and get user info
      fetch(buildApiUrl('/auth/verify'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      })
      .catch(() => {
        // Don't clear token on error if we have user data
        console.warn('Failed to verify token, using cached user data');
      });
    }
  }, [token, user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        return true;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, username: string, referralCode?: string): Promise<string | true> => {
    try {
      const response = await fetch(buildApiUrl('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username, referralCode: referralCode || undefined }),
      });
      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        return true;
      } else {
        return data.error || 'Ошибка регистрации';
      }
    } catch (error) {
      return 'Ошибка соединения с сервером';
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const loginWithTelegram = (token: string, userData: any) => {
    setToken(token);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ Telegram login successful, user:', userData);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    loginWithTelegram,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isPremium: user?.subscription_type === 'premium'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
