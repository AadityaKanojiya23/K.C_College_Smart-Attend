import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import { fetch } from 'expo/fetch';
import { router } from 'expo-router';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  class?: string;
  subject?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  refetch: () => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function navigateByRole(role: UserRole) {
  if (role === 'admin') router.replace('/(admin)/');
  else if (role === 'teacher') router.replace('/(teacher)/');
  else router.replace('/(student)/');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/me', baseUrl);
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user as AppUser;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const login = async (email: string, password: string): Promise<AppUser> => {
    const res = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await res.json();
    const loggedUser = data.user as AppUser;
    setUser(loggedUser);
    navigateByRole(loggedUser.role);
    return loggedUser;
  };

  const logout = async () => {
    await apiRequest('POST', '/api/auth/logout');
    setUser(null);
    router.replace('/login');
  };

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refetch }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
