import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

const SESSION_KEY = '@advocate_desk/auth_session';

export interface StoredSession {
  token: string;
  username: string;
  lawyerName?: string;
  role?: string;
  lawyerId?: string | null;
  assignedTasks?: string[];
}

export interface AuthContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  username: string;
  lawyerName: string;
  role: string;
  lawyerId: string | null;
  assignedTasks: string[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      apiClient.setAccessToken(null);
      setSession(null);
      void AsyncStorage.removeItem(SESSION_KEY);
    });
    return () => apiClient.setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored) as StoredSession;
        if (!parsed.token || !parsed.username) throw new Error('Invalid stored session');
        apiClient.setAccessToken(parsed.token);
        const confirmed = await apiClient.validateSession();
        if (active) {
          const updatedSession: StoredSession = {
            token: parsed.token,
            username: confirmed.username,
            lawyerName: confirmed.lawyerName || confirmed.username,
            role: confirmed.role || parsed.role || 'lawyer',
            lawyerId: confirmed.lawyerId !== undefined ? confirmed.lawyerId : (parsed.lawyerId || null),
            assignedTasks: confirmed.assignedTasks || parsed.assignedTasks || [],
          };
          setSession(updatedSession);
        }
      } catch {
        apiClient.setAccessToken(null);
        await AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
      } finally {
        if (active) setIsReady(true);
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isReady,
    isAuthenticated: Boolean(session),
    username: session?.username || '',
    lawyerName: session?.lawyerName || session?.username || '',
    role: session?.role || 'lawyer',
    lawyerId: session?.lawyerId || null,
    assignedTasks: session?.assignedTasks || [],
    login: async (username: string, password: string) => {
      const authenticated = await apiClient.login(username, password);
      const nextSession: StoredSession = {
        token: authenticated.token,
        username: authenticated.username,
        lawyerName: authenticated.lawyerName || authenticated.username,
        role: authenticated.role || 'lawyer',
        lawyerId: authenticated.lawyerId || null,
        assignedTasks: authenticated.assignedTasks || [],
      };
      apiClient.setAccessToken(nextSession.token);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    },
    logout: async () => {
      apiClient.setAccessToken(null);
      setSession(null);
      await AsyncStorage.removeItem(SESSION_KEY);
    },
  }), [isReady, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
