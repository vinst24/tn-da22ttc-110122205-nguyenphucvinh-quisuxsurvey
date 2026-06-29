import type { User } from '@prisma/client';
import { prisma } from '../prisma/client.js';

type NewUserInput = Pick<User, 'email' | 'passwordHash' | 'role'> & {
  fullname?: string | null;
};

export const userRepo = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: number) => prisma.user.findUnique({ where: { id } }),
  findWithParticipant: (id: number) =>
    prisma.user.findUnique({ where: { id }, include: { participant: true } }),
  update: (id: number, data: { email?: string; fullname?: string | null; passwordHash?: string }) =>
    prisma.user.update({ where: { id }, data }),
  create: (data: NewUserInput) => prisma.user.create({ data }),
  incrementTokenVersion: async (_id: number) => {
    // tokenVersion is not present in the current schema, so logout is a no-op
    return null;
  },
};
