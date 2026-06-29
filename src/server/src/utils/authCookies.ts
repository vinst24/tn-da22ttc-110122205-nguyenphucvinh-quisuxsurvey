import type { Response } from 'express';
import { cookieOptions } from '../configs/cookies.js';
import { TOKEN_COOKIE, TOKEN_TTL } from '../constants/tokens.js';

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) => {
  res.cookie(TOKEN_COOKIE.ACCESS, tokens.accessToken, {
    ...cookieOptions,
    maxAge: TOKEN_TTL.ACCESS_SECONDS * 1000,
  });
  res.cookie(TOKEN_COOKIE.REFRESH, tokens.refreshToken, {
    ...cookieOptions,
    maxAge: TOKEN_TTL.REFRESH_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(TOKEN_COOKIE.ACCESS, { ...cookieOptions });
  res.clearCookie(TOKEN_COOKIE.REFRESH, { ...cookieOptions });
};

