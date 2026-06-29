import type { RequestHandler } from 'express';
import { TOKEN_COOKIE } from '../constants/tokens.js';
import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { clearAuthCookies, setAuthCookies } from '../utils/authCookies.js';
import { badRequest } from '../utils/errors.js';
import { verifyRefreshToken } from '../utils/jwt.js';
import { created, ok } from '../utils/response.js';

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  const { status, body } = created({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  res.status(status).json(body);
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  const { status, body } = ok({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  res.status(status).json(body);
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const token = (req.cookies?.[TOKEN_COOKIE.REFRESH] as string | undefined) ?? (req.body?.refreshToken as string | undefined);
  if (!token) throw badRequest('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const result = await authService.refresh(token);
  setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  const { status, body } = ok({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  res.status(status).json(body);
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  const refreshToken = (req.cookies?.[TOKEN_COOKIE.REFRESH] as string | undefined) ?? (req.body?.refreshToken as string | undefined);
  if (req.auth?.userId) {
    await authService.logout(req.auth.userId);
  } else if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.sub) await authService.logout(payload.sub);
    } catch {
      // Ignore invalid refresh token and still clear cookies
    }
  }

  clearAuthCookies(res);
  const { status, body } = ok({ message: 'Đã đăng xuất' });
  res.status(status).json(body);
});

export const me: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.auth?.userId) {
    const { status, body } = ok({ user: null, participant: null });
    res.status(status).json(body);
    return;
  }

  const result = await authService.me(req.auth.userId);
  const { status, body } = ok(result);
  res.status(status).json(body);
});

export const updateProfile: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.updateProfile(req.auth!.userId, req.body);
  const { status, body } = ok(result);
  res.status(status).json(body);
});

export const changePassword: RequestHandler = asyncHandler(async (req, res) => {
  await authService.changePassword(req.auth!.userId, req.body);
  const { status, body } = ok({ message: 'Mật khẩu đã được cập nhật' });
  res.status(status).json(body);
});
