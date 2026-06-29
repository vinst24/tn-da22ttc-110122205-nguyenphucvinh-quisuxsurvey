export const TOKEN_COOKIE = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
} as const;

export const TOKEN_TTL = {
  ACCESS_SECONDS: 30 * 60,
  REFRESH_DAYS: 30,
} as const;

