import { env } from './env.js';

const isProduction = env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? 'none' as const : 'lax' as const,
  secure: isProduction || env.COOKIE_SECURE,
  path: '/',
};
