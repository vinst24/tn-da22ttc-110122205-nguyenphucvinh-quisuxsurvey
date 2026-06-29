import { randomUUID } from 'crypto';
import type { Participant, Specialty } from '@prisma/client';
import { TOKEN_TTL } from '../constants/tokens.js';
import { participantRepo } from '../repositories/participant.repo.js';
import { refreshTokenRepo } from '../repositories/refreshToken.repo.js';
import { userRepo } from '../repositories/user.repo.js';
import { conflict, unauthorized } from '../utils/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const serializeParticipant = (participant: Participant | null) =>
  participant
    ? {
        ...participant,
        fullName: participant.nickname ?? null,
        major: participant.specialty ?? null,
      }
    : null;

const createRefreshTokenForUser = async (userId: number) => {
  const tokenId = randomUUID();
  const refreshToken = signRefreshToken({ sub: String(userId), jti: tokenId });
  const expiresAt = new Date(Date.now() + TOKEN_TTL.REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await refreshTokenRepo.create({ tokenId, userId, expiresAt });
  return { refreshToken, tokenId };
};

export const authService = {
  register: async (input: { email: string; password: string; fullName?: string }) => {
    const existing = await userRepo.findByEmail(input.email);
    if (existing) throw conflict('\u0045mail \u0111\u00e3 \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng.');

    const passwordHash = await hashPassword(input.password);
    const fullName = input.fullName?.trim() || null;

    const user = await userRepo.create({
      email: input.email,
      passwordHash,
      role: 'USER',
      fullname: fullName,
    });

    await participantRepo.createForUser(user.id, fullName ?? undefined);

    const accessToken = signAccessToken({ sub: String(user.id), role: user.role });
    const { refreshToken } = await createRefreshTokenForUser(user.id);

    return { user: { id: String(user.id), email: user.email, role: user.role, fullName: user.fullname ?? null }, accessToken, refreshToken };
  },

  login: async (input: { email: string; password: string }) => {
    const user = await userRepo.findByEmail(input.email);
    if (!user) throw unauthorized('Tài khoản email không tồn tại.');

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw unauthorized('Mật khẩu không chính xác.');

    const accessToken = signAccessToken({ sub: String(user.id), role: user.role });
    const { refreshToken } = await createRefreshTokenForUser(user.id);
    return { user: { id: String(user.id), email: user.email, role: user.role, fullName: user.fullname ?? null }, accessToken, refreshToken };
  },

  refresh: async (refreshToken: string) => {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload.jti) throw unauthorized();

    const userId = Number(payload.sub);
    const tokenRecord = await refreshTokenRepo.findByTokenId(payload.jti);
    if (!tokenRecord || tokenRecord.userId !== userId) throw unauthorized();

    if (tokenRecord.revokedAt) {
      await refreshTokenRepo.revokeAllByUserId(userId);
      throw unauthorized('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
    }

    if (tokenRecord.expiresAt < new Date()) throw unauthorized('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

    const user = await userRepo.findById(userId);
    if (!user) throw unauthorized();

    const { refreshToken: newRefreshToken, tokenId: newTokenId } = await createRefreshTokenForUser(user.id);
    await refreshTokenRepo.revoke(tokenRecord.id, newTokenId);

    const newAccessToken = signAccessToken({ sub: String(user.id), role: user.role });
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: String(user.id), email: user.email, role: user.role, fullName: user.fullname ?? null },
    };
  },

  logout: async (userId?: string) => {
    if (!userId) return;
    await refreshTokenRepo.revokeAllByUserId(Number(userId));
  },

  me: async (userId: string) => {
    const user = await userRepo.findWithParticipant(Number(userId));
    if (!user) throw unauthorized();
    return {
      user: { id: String(user.id), email: user.email, role: user.role, fullName: user.fullname ?? null },
      participant: serializeParticipant(user.participant),
    };
  },

  updateProfile: async (userId: string, input: { email?: string; fullName?: string; specialty?: Specialty | null }) => {
    const user = await userRepo.findById(Number(userId));
    if (!user) throw unauthorized();

    if (input.email && input.email !== user.email) {
      const existing = await userRepo.findByEmail(input.email);
      if (existing && existing.id !== user.id) throw conflict('\u0045mail \u0111\u00e3 \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng.');
    }

    const fullName = input.fullName?.trim() || null;

    const updatedUser = await userRepo.update(Number(userId), {
      email: input.email,
      fullname: fullName,
    });

    const updatedParticipant = await participantRepo.updateByUserId(Number(userId), {
      nickname: fullName,
      ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
    });

    return {
      user: { id: String(updatedUser.id), email: updatedUser.email, role: updatedUser.role, fullName: updatedUser.fullname ?? null },
      participant: serializeParticipant(updatedParticipant),
    };
  },

  changePassword: async (userId: string, input: { currentPassword: string; newPassword: string }) => {
    const user = await userRepo.findById(Number(userId));
    if (!user) throw unauthorized();

    const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValid) throw unauthorized('Mật khẩu hiện tại không chính xác.');

    const newPasswordHash = await hashPassword(input.newPassword);
    await userRepo.update(Number(userId), { passwordHash: newPasswordHash });
  },
};
