import jwt from 'jsonwebtoken';
import { env } from '../configs/env.js';
import { TOKEN_TTL } from '../constants/tokens.js';

export type AccessTokenPayload = {
  sub: string;
  role: 'ADMIN' | 'USER';
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: TOKEN_TTL.ACCESS_SECONDS });
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${TOKEN_TTL.REFRESH_DAYS}d` });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

