import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import type { ParticipantDto, Specialty, UserDto } from '../types/auth';

type AuthState = {
  user: UserDto | null;
  participant: ParticipantDto | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (input: { email: string; password: string }) => Promise<import('../types/auth').UserDto>;
  register: (input: { email: string; password: string; fullName?: string }) => Promise<import('../types/auth').UserDto>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: { email?: string; fullName?: string; specialty?: Specialty | null }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({ user: null, participant: null, loading: true });

  useEffect(() => {
    let mounted = true;
    authService
      .me()
      .then((res) => {
        if (!mounted) return;
        setState({ user: res.user, participant: res.participant, loading: false });
      })
      .catch(() => {
        if (!mounted) return;
        setState({ user: null, participant: null, loading: false });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      ...state,
      login: async (input) => {
        await authService.login(input);
        const me = await authService.me();
        if (!me.user) throw new Error('Authenticated user not found after login');
        setState({ user: me.user, participant: me.participant, loading: false });
        return me.user;
      },
      register: async (input) => {
        await authService.register(input);
        const me = await authService.me();
        if (!me.user) throw new Error('Authenticated user not found after register');
        setState({ user: me.user, participant: me.participant, loading: false });
        return me.user;
      },
      logout: async () => {
        await authService.logout();
        setState({ user: null, participant: null, loading: false });
      },
      refresh: async () => {
        await authService.refresh();
        const me = await authService.me();
        setState((s) => ({ ...s, user: me.user, participant: me.participant }));
      },
      updateProfile: async (input) => {
        const me = await authService.updateProfile(input);
        setState((s) => ({ ...s, user: me.user, participant: me.participant }));
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
