import { Router } from 'express';
import { changePassword, login, logout, me, refresh, register, updateProfile } from '../controllers/auth.controller.js';
import { attachAuthIfPresent, requireAuth } from '../middlewares/auth.js';
import { loginRateLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import { changePasswordBody, loginBody, profileBody, registerBody } from '../validations/auth.validation.js';

export const authRouter = Router();

authRouter.post('/auth/register', validate({ body: registerBody }), register);
authRouter.post('/auth/login', loginRateLimiter, validate({ body: loginBody }), login);
authRouter.post('/auth/refresh', refresh);
authRouter.post('/auth/logout', attachAuthIfPresent, logout);
authRouter.get('/auth/me', attachAuthIfPresent, me);
authRouter.patch('/auth/me', requireAuth, validate({ body: profileBody }), updateProfile);
authRouter.post('/auth/me/password', requireAuth, validate({ body: changePasswordBody }), changePassword);
