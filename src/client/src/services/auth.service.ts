import {
  api,
  clearStoredAuthTokens,
  getStoredRefreshToken,
  rawApi,
  setStoredAuthTokens,
} from '../api/http';
import type { ApiResponse } from '../types/api';
import { unwrap } from '../types/api';
import type { ParticipantDto, Specialty, UserDto } from '../types/auth';

type AuthSessionDto = {
  user: UserDto;
  accessToken?: string;
  refreshToken?: string;
};

const rememberSession = (session: AuthSessionDto) => {
  setStoredAuthTokens(session.accessToken, session.refreshToken);
  return { user: session.user };
};

export const authService = {
  register: async (input: { email: string; password: string; fullName?: string }) => {
    const { data } = await api.post<ApiResponse<AuthSessionDto>>('/auth/register', input);
    return rememberSession(unwrap(data));
  },

  login: async (input: { email: string; password: string }) => {
    const { data } = await api.post<ApiResponse<AuthSessionDto>>('/auth/login', input);
    return rememberSession(unwrap(data));
  },

  logout: async () => {
    try {
      const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/logout', {
        refreshToken: getStoredRefreshToken(),
      });
      return unwrap(data);
    } finally {
      clearStoredAuthTokens();
    }
  },

  refresh: async () => {
    const { data } = await rawApi.post<ApiResponse<AuthSessionDto>>('/auth/refresh', {
      refreshToken: getStoredRefreshToken(),
    });
    return rememberSession(unwrap(data));
  },

  me: async () => {
    const { data } = await api.get<ApiResponse<{ user: UserDto | null; participant: ParticipantDto | null }>>(
      '/auth/me',
    );
    const session = unwrap(data);
    if (!session.user && getStoredRefreshToken()) {
      try {
        await authService.refresh();
        const retry = await api.get<ApiResponse<{ user: UserDto | null; participant: ParticipantDto | null }>>(
          '/auth/me',
        );
        return unwrap(retry.data);
      } catch {
        clearStoredAuthTokens();
      }
    }
    return session;
  },

  updateProfile: async (input: { email?: string; fullName?: string; specialty?: Specialty | null }) => {
    const { data } = await api.patch<ApiResponse<{ user: UserDto; participant: ParticipantDto | null }>>(
      '/auth/me',
      input,
    );
    return unwrap(data);
  },

  changePassword: async (input: { currentPassword: string; newPassword: string }) => {
    const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/me/password', input);
    return unwrap(data);
  },
};
