import type { Request, RequestHandler } from 'express';
import { TOKEN_COOKIE } from '../constants/tokens.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/jwt.js';

export type AuthUser = {
  userId: string;
  role: 'ADMIN' | 'USER';
};

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthUser;
  }
}

const readAccessToken = (req: Request) => {
  const cookieToken = req.cookies?.[TOKEN_COOKIE.ACCESS] as string | undefined;
  if (cookieToken) return cookieToken;

  const authorization = req.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readAccessToken(req);
  if (!token) return next(unauthorized());

  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(unauthorized('\u0050hi\u00ean \u0111\u0103ng nh\u1eadp kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111\u00e3 h\u1ebft h\u1ea1n'));
  }
};

export const attachAuthIfPresent: RequestHandler = (req, _res, next) => {
  const token = readAccessToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
  } catch {
    // ignore
  }
  return next();
};

export const requireRole = (role: 'ADMIN' | 'USER'): RequestHandler => {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (req.auth.role !== role) return next(forbidden());
    return next();
  };
};
