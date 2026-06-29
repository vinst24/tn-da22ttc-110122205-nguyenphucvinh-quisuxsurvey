import { prisma } from '../prisma/client.js';

export const refreshTokenRepo = {
  create: (data: { tokenId: string; userId: number; expiresAt: Date }) =>
    prisma.refreshToken.create({ data }),

  findByTokenId: (tokenId: string) => prisma.refreshToken.findUnique({ where: { tokenId } }),

  revoke: (id: number, replacedByTokenId?: string) =>
    prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date(), replacedByTokenId } }),
  revokeAllByUserId: (userId: number) =>
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),

  deleteExpiredOrOldRevoked: (opts: { now: Date; revokedBefore: Date }) =>
    prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: opts.now } },
          { revokedAt: { not: null, lt: opts.revokedBefore } },
        ],
      },
    }),
};
