import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? '/api';
const ACCESS_TOKEN_KEY = 'quis_access_token';
const REFRESH_TOKEN_KEY = 'quis_refresh_token';

type AuthTokenPayload = {
  accessToken?: string;
  refreshToken?: string;
};

type RefreshApiResponse = {
  success: boolean;
  data?: AuthTokenPayload;
};

const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const getStoredAccessToken = () => {
  if (!canUseSessionStorage()) return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getStoredRefreshToken = () => {
  if (!canUseSessionStorage()) return null;
  return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setStoredAuthTokens = (accessToken?: string, refreshToken?: string) => {
  if (!canUseSessionStorage()) return;
  if (accessToken) window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearStoredAuthTokens = () => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const rawApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Endpoints that always require authentication
const AUTH_REQUIRED_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/me',
];

// Helper: check if the URL matches an endpoint exactly (starts with)
const matchesEndpoint = (url: string, endpoint: string) => {
  return url === endpoint || url.startsWith(endpoint + '/') || url.startsWith(endpoint + '?');
};

// Endpoints that NEVER require authentication (public endpoints)
const PUBLIC_ENDPOINTS = [
  '/responses',
  '/health',
  '/participants/guest/info',
];

// Public survey endpoints - GET only, no auth needed
// These are: GET /surveys (list) and GET /surveys/:id (detail)
// NOT: /surveys/:id/tokens (requires auth)
const PUBLIC_SURVEY_ENDPOINTS = [
  { method: 'get' as const, path: '/surveys', pattern: /^\/surveys$/ },
  { method: 'get' as const, path: '/surveys/', pattern: /^\/surveys\/\d+$/ },  // /surveys/:id  (numeric id only)
  { method: 'get' as const, path: '/survey-tokens', pattern: /^\/survey-tokens\// }, // /survey-tokens/:code
];

const isPublicSurveyEndpoint = (url: string, method: string): boolean => {
  // Remove /api prefix if present (baseURL is '/api')
  const cleanUrl = url.replace(/^\/api/, '') || url;
  const urlLower = cleanUrl.toLowerCase();
  const methodLower = method.toLowerCase();
  return PUBLIC_SURVEY_ENDPOINTS.some((ep) => {
    if (methodLower !== ep.method) return false;
    return ep.pattern.test(urlLower);
  });
};

const isPublicEndpoint = (url: string, method: string): boolean => {
  // Remove /api prefix if present (baseURL is '/api')
  const cleanUrl = url.replace(/^\/api/, '') || url;
  if (PUBLIC_ENDPOINTS.some((ep) => matchesEndpoint(cleanUrl, ep))) return true;
  if (isPublicSurveyEndpoint(url, method)) return true;
  return false;
};


api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  if (url.includes('/auth/login') || url.includes('/auth/register')) return config;

  const token = getStoredAccessToken();
  if (!token) return config;

  if (typeof config.headers?.set === 'function') {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` } as typeof config.headers;
  }
  return config;
});
let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const cfg = error.config as RetriableConfig | undefined;
    const url = cfg?.url ?? '';
    const method = cfg?.method?.toLowerCase() ?? 'get';

    // Skip auth refresh for auth endpoints
    if (AUTH_REQUIRED_ENDPOINTS.some((ep) => url.includes(ep))) {
      return Promise.reject(error);
    }

    // Skip auth refresh for public endpoints - just retry without auth
    if (isPublicEndpoint(url, method)) {
      if (status === 401 && cfg && !cfg._retry) {
        cfg._retry = true;
        return api(cfg); // Retry without auth refresh - endpoint will process without user context
      }
      return Promise.reject(error);
    }

    // For other endpoints (that require auth), try refresh on 401
    if (status === 401 && cfg && !cfg._retry) {
      cfg._retry = true;
      refreshPromise ??= rawApi
        .post<RefreshApiResponse>('/auth/refresh', { refreshToken: getStoredRefreshToken() })
        .then(({ data }) => {
          setStoredAuthTokens(data.data?.accessToken, data.data?.refreshToken);
        })
        .finally(() => {
          refreshPromise = null;
        });

      // Always retry after attempting refresh
      await refreshPromise.catch(() => {});
      return api(cfg);
    }

    return Promise.reject(error);
  },
);