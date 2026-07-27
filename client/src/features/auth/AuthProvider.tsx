import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@/types/user';
import type { LoginPayload, RegisterPayload, SessionStatus } from '@/types/auth';
import { authApi } from './api/auth.api';
import { logger } from '@/lib/logger/logger';

interface AuthContextValue {
  user: User | null;
  status: SessionStatus;
  role: User['role'] | null;
  login: (p: LoginPayload) => Promise<void>;
  register: (p: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  const hydrate = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const login = useCallback(async (p: LoginPayload) => {
    const me = await authApi.login(p);
    setUser(me);
    setStatus('authenticated');
    logger.info({ action: 'LOGIN_SUCCESS', message: 'User logged in', meta: { userId: me.id } });
  }, []);

  const register = useCallback(async (p: RegisterPayload) => {
    await authApi.register(p);
    logger.info({ action: 'REGISTER_SUBMITTED', message: 'Registration submitted' });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('anonymous');
    logger.info({ action: 'LOGOUT', message: 'User logged out' });
  }, []);

  const value: AuthContextValue = {
    user,
    status,
    role: user?.role ?? null,
    login,
    register,
    logout,
    refetch: hydrate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
