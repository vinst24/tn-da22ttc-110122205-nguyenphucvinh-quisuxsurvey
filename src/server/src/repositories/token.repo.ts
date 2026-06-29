import { prisma } from '../prisma/client.js';

export const tokenRepo = {
  findByCode: (code: string) =>
    prisma.surveyToken.findUnique({
      where: { code },
      include: { survey: true },
    }),

  findById: (id: string | number) =>
    prisma.surveyToken.findUnique({
      where: { id: Number(id) },
    }),

  findValidToken: (token: string) =>
    tokenRepo.findByCode(token),

  listBySurvey: (surveyId: string) =>
    prisma.surveyToken.findMany({
      where: { surveyId: Number(surveyId) },
      orderBy: { createdAt: 'desc' },
    }),

  create: (data: {
    surveyId: string;
    token: string;
    validTo?: Date | null;
    validFrom?: Date | null;
    maxUsage?: number | null;
  }) =>
    prisma.surveyToken.create({
      data: {
        surveyId: Number(data.surveyId),
        code: data.token,
        validFrom: data.validFrom ?? null,
        validTo: data.validTo ?? null,
        maxUsage: data.maxUsage ?? null,
      },
    }),

  incrementUsage: (id: string | number) =>
    prisma.surveyToken.update({
      where: { id: Number(id) },
      data: { usageCount: { increment: 1 } },
    }),

  remove: (id: string | number) =>
    prisma.surveyToken.delete({
      where: { id: Number(id) },
    }),
};
