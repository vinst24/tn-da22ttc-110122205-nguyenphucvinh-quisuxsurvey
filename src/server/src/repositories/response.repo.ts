import { prisma } from '../prisma/client.js';

type DraftDetail = { questionId: string; score: number };

const toDetailRows = (responseId: number, details: DraftDetail[]) =>
  details.map((d) => ({
    responseId,
    questionId: Number(d.questionId),
    score: d.score,
    answeredAt: new Date(),
  }));

export const responseRepo = {
  createResponse: (data: {
    surveyId: string;
    participantId: string;
    details: DraftDetail[];
    overallFeedback?: string;
  }) =>
    prisma.response.create({
      data: {
        surveyId: Number(data.surveyId),
        participantId: Number(data.participantId),
        isComplete: true,
        completionPercent: 100,
        overallFeedback: data.overallFeedback ?? null,
        lastSavedAt: new Date(),
        responseDetails: {
          createMany: {
            data: data.details.map((detail) => ({
              questionId: Number(detail.questionId),
              score: detail.score,
              answeredAt: new Date(),
            })),
          },
        },
      },
      include: { responseDetails: true },
    }),

  findOpenDraft: (surveyId: string, participantId: string) =>
    prisma.response.findFirst({
      where: {
        surveyId: Number(surveyId),
        participantId: Number(participantId),
        isComplete: false,
      },
      include: { responseDetails: true },
      orderBy: { createdAt: 'desc' },
    }),

  createDraft: (data: {
    surveyId: string;
    participantId: string;
    details: DraftDetail[];
    completionPercent: number;
    overallFeedback?: string;
  }) =>
    prisma.response.create({
      data: {
        surveyId: Number(data.surveyId),
        participantId: Number(data.participantId),
        isComplete: false,
        completionPercent: data.completionPercent,
        overallFeedback: data.overallFeedback ?? null,
        lastSavedAt: new Date(),
        responseDetails: {
          createMany: {
            data: data.details.map((detail) => ({
              questionId: Number(detail.questionId),
              score: detail.score,
              answeredAt: new Date(),
            })),
          },
        },
      },
      include: { responseDetails: true },
    }),

  replaceDraftDetails: (responseId: number, details: DraftDetail[], completionPercent: number, overallFeedback?: string) =>
    prisma.$transaction(async (tx) => {
      await tx.responseDetail.deleteMany({ where: { responseId } });
      if (details.length > 0) {
        await tx.responseDetail.createMany({ data: toDetailRows(responseId, details) });
      }
      return tx.response.update({
        where: { id: responseId },
        data: {
          completionPercent,
          lastSavedAt: new Date(),
          ...(overallFeedback !== undefined ? { overallFeedback } : {}),
        },
        include: { responseDetails: true },
      });
    }),

  markComplete: (responseId: number, details: DraftDetail[], completionPercent: number, overallFeedback?: string) =>
    prisma.$transaction(async (tx) => {
      await tx.responseDetail.deleteMany({ where: { responseId } });
      if (details.length > 0) {
        await tx.responseDetail.createMany({ data: toDetailRows(responseId, details) });
      }
      const now = new Date();
      return tx.response.update({
        where: { id: responseId },
        data: {
          isComplete: true,
          completionPercent,
          lastSavedAt: now,
          submittedAt: now,
          ...(overallFeedback !== undefined ? { overallFeedback } : {}),
        },
        include: { responseDetails: true },
      });
    }),

  deleteDraft: (responseId: number) =>
    prisma.response.delete({ where: { id: responseId } }),

  deleteStaleDraftsBelow80: async (opts: { surveyId?: number; beforeDate?: Date } = {}) => {
    const where: Record<string, unknown> = {
      isComplete: false,
      completionPercent: { lt: 80 },
    };
    if (opts.surveyId !== undefined) where.surveyId = opts.surveyId;
    if (opts.beforeDate) where.lastSavedAt = { lt: opts.beforeDate };

    const result = await prisma.response.deleteMany({ where });
    return { count: result.count };
  },

  listBySurvey: (
    surveyId: string,
    opts: { skip: number; take: number; includePartial?: boolean },
  ) =>
    prisma.response.findMany({
      where: {
        surveyId: Number(surveyId),
        ...(opts.includePartial
          ? { OR: [{ isComplete: true }, { completionPercent: { gte: 80 } }] }
          : { isComplete: true }),
      },
      orderBy: { submittedAt: 'desc' },
      skip: opts.skip,
      take: opts.take,
      include: {
        participant: true,
        responseDetails: { include: { question: { include: { category: true } } } },
      },
    }),

  countBySurvey: (surveyId: string, opts: { includePartial?: boolean } = {}) =>
    prisma.response.count({
      where: {
        surveyId: Number(surveyId),
        ...(opts.includePartial
          ? { OR: [{ isComplete: true }, { completionPercent: { gte: 80 } }] }
          : { isComplete: true }),
      },
    }),

  listByParticipant: (participantId: number, opts: { skip: number; take: number }) =>
    prisma.response.findMany({
      where: { participantId },
      orderBy: [{ submittedAt: 'desc' }, { lastSavedAt: 'desc' }],
      skip: opts.skip,
      take: opts.take,
      select: {
        id: true,
        surveyId: true,
        submittedAt: true,
        lastSavedAt: true,
        isComplete: true,
        completionPercent: true,
        survey: { select: { id: true, title: true, description: true, slug: true, isActive: true } },
      },
    }),

  listByParticipantAll: (participantId: number) =>
    prisma.response.findMany({
      where: { participantId },
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        surveyId: true,
        submittedAt: true,
        createdAt: true,
        isComplete: true,
        completionPercent: true,
      },
    }),

  listParticipantHistoryRows: (participantId: number) =>
    prisma.response.findMany({
      where: { participantId },
      orderBy: [{ submittedAt: 'desc' }, { lastSavedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        surveyId: true,
        submittedAt: true,
        lastSavedAt: true,
        createdAt: true,
        isComplete: true,
        completionPercent: true,
        survey: {
          select: {
            id: true,
            title: true,
            description: true,
            slug: true,
            isActive: true,
            isPublic: true,
          },
        },
      },
    }),

  listParticipantSurveyHistoryRows: (participantId: number, surveyId: number) =>
    prisma.response.findMany({
      where: { participantId, surveyId },
      orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        surveyId: true,
        submittedAt: true,
        lastSavedAt: true,
        createdAt: true,
        isComplete: true,
        completionPercent: true,
      },
    }),
  countByParticipant: (participantId: number) =>
    prisma.response.count({
      where: { participantId },
    }),
};
