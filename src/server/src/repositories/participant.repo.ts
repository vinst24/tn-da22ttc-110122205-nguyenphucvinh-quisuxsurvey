import type { Specialty } from '@prisma/client';
import { prisma } from '../prisma/client.js';

function createParticipantCode() {
  return `P${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function buildParticipantWhere(opts: {
  q?: string;
  isGuest?: boolean;
  specialty?: Specialty;
  surveyId?: number;
  createdFrom?: string;
  createdTo?: string;
}) {
  const where: Record<string, unknown> = {};

  if (opts.surveyId !== undefined) {
    where.responses = { some: { surveyId: opts.surveyId } };
  }

  if (opts.q) {
    where.OR = [
      { nickname: { contains: opts.q, mode: 'insensitive' } },
      { participantCode: { contains: opts.q, mode: 'insensitive' } },
      { user: { fullname: { contains: opts.q, mode: 'insensitive' } } },
      { user: { email: { contains: opts.q, mode: 'insensitive' } } },
    ];
  }

  if (opts.isGuest !== undefined) {
    where.isGuest = opts.isGuest;
  }

  if (opts.specialty) {
    where.specialty = opts.specialty;
  }

  if (opts.createdFrom || opts.createdTo) {
    where.createdAt = {};
    if (opts.createdFrom) {
      where.createdAt = { ...(where.createdAt as object), gte: new Date(opts.createdFrom) };
    }
    if (opts.createdTo) {
      where.createdAt = { ...(where.createdAt as object), lte: new Date(opts.createdTo) };
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export const participantRepo = {
  createForUser: (userId: number, fullName?: string) =>
    prisma.participant.create({
      data: {
        userId,
        participantCode: createParticipantCode(),
        nickname: fullName,
        isGuest: false,
      },
    }),

  createGuest: (data?: { nickname?: string; specialty?: Specialty }) =>
    prisma.participant.create({
      data: {
        participantCode: createParticipantCode(),
        nickname: data?.nickname,
        specialty: data?.specialty,
        isGuest: true,
      },
    }),

  findByUserId: (userId: number) => prisma.participant.findUnique({ where: { userId } }),
  findByParticipantCode: (code: string) =>
    prisma.participant.findUnique({ where: { participantCode: code } }),
  updateByUserId: (userId: number, data: { nickname?: string | null; specialty?: Specialty | null }) =>
    prisma.participant.upsert({
      where: { userId },
      update: {
        ...(data.nickname !== undefined ? { nickname: data.nickname } : {}),
        ...(data.specialty !== undefined ? { specialty: data.specialty } : {}),
      },
      create: {
        userId,
        participantCode: createParticipantCode(),
        nickname: data.nickname,
        specialty: data.specialty,
        isGuest: false,
      },
    }),

  updateGuestInfo: (participantCode: string, data: { nickname?: string; specialty?: Specialty }) =>
    prisma.participant.update({
      where: { participantCode },
      data: {
        ...(data.nickname !== undefined ? { nickname: data.nickname } : {}),
        ...(data.specialty !== undefined ? { specialty: data.specialty } : {}),
      },
    }),
  // admin helpers
  list: (opts: {
    skip: number;
    take: number;
    q?: string;
    isGuest?: boolean;
    specialty?: Specialty;
    surveyId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) =>
    prisma.participant.findMany({
      skip: opts.skip,
      take: opts.take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        ...(opts.surveyId
          ? {
              responses: {
                where: { surveyId: opts.surveyId },
                select: { surveyId: true, submittedAt: true },
                orderBy: { submittedAt: 'desc' as const },
                take: 1,
              },
            }
          : {}),
      },
      where: buildParticipantWhere(opts),
    }),

  listAll: (opts: {
    q?: string;
    isGuest?: boolean;
    specialty?: Specialty;
    surveyId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) =>
    prisma.participant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        ...(opts.surveyId !== undefined
          ? {
              responses: {
                where: { surveyId: opts.surveyId },
                select: { surveyId: true, submittedAt: true },
                orderBy: { submittedAt: 'desc' as const },
                take: 1,
              },
            }
          : {}),
      },
      where: buildParticipantWhere(opts),
    }),

  count: (opts: {
    q?: string;
    isGuest?: boolean;
    specialty?: Specialty;
    surveyId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) =>
    prisma.participant.count({
      where: buildParticipantWhere(opts),
    }),

  findById: (id: number) =>
    prisma.participant.findUnique({
      where: { id },
      include: {
        user: true,
        responses: {
          orderBy: { updatedAt: 'desc' },
          include: {
            survey: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    }),
  deleteExpiredEmptyGuests: (beforeDate: Date) =>
    prisma.participant.deleteMany({
      where: {
        isGuest: true,
        userId: null,
        updatedAt: { lt: beforeDate },
        responses: { none: {} },
      },
    }),

  delete: (id: number) => prisma.participant.delete({ where: { id } }),
};
