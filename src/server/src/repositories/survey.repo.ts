import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';

export const surveyRepo = {
  list: async (opts: {
    skip: number;
    take: number;
    where?: Prisma.SurveyWhereInput;
    orderBy?: Prisma.SurveyOrderByWithRelationInput;
  }) => {
    const rows = await prisma.survey.findMany({
      where: opts.where,
      orderBy: opts.orderBy ?? { createdAt: 'desc' },
      skip: opts.skip,
      take: opts.take,
      include: {
        _count: { select: { surveyCategories: true, responses: true } },
        surveyCategories: {
          include: {
            category: {
              include: { _count: { select: { questions: true } } },
            },
          },
        },
      },
    });
    return rows.map((s) => {
      const { _count, surveyCategories, ...rest } = s;
      const questions = surveyCategories.reduce(
        (sum, sc) => sum + (sc.category._count?.questions ?? 0),
        0,
      );
      return {
        ...rest,
        _count: { categories: _count.surveyCategories, responses: _count.responses, questions },
      };
    });
  },

  count: (where?: Prisma.SurveyWhereInput) => prisma.survey.count({ where }),

  findById: (id: number) => prisma.survey.findUnique({ where: { id } }),

  findBySlug: async (slug: string) => {
    const survey = await prisma.survey.findUnique({
      where: { slug },
      include: {
        _count: { select: { responses: true } },
        surveyCategories: {
          orderBy: { order: 'asc' as const },
          include: {
            category: {
              include: { questions: { orderBy: { order: 'asc' as const } } },
            },
          },
        },
      },
    });
    if (!survey) return null;
    const { surveyCategories, _count, ...rest } = survey;
    const categories = surveyCategories.map((sc) => ({ ...sc.category, order: sc.order }));
    return { ...rest, categories, _count };
  },

  findSlug: (slug: string) => prisma.survey.findUnique({ where: { slug }, select: { id: true } }),

  findByTitleFamily: async (title: string, excludeId?: number) =>
    prisma.survey.findMany({
      where: {
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
        OR: [{ title }, { title: { startsWith: title } }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        expiresAt: true,
      },
    }),

  findByIdWithCategories: async (id: number) => {
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        _count: { select: { responses: true } },
        surveyCategories: {
          orderBy: { order: 'asc' as const },
          include: {
            category: {
              include: { questions: { orderBy: { order: 'asc' as const } } },
            },
          },
        },
      },
    });
    if (!survey) return null;
    const { surveyCategories, _count, ...rest } = survey;
    const categories = surveyCategories.map((sc) => ({ ...sc.category, order: sc.order }));
    return { ...rest, categories, _count };
  },

  create: (data: {
    title: string;
    description?: string;
    isActive?: boolean;
    isPublic?: boolean;
    expiresAt?: Date | null;
    slug: string;
  }) => prisma.survey.create({ data }),

  createWithAllCategories: (data: {
    title: string;
    description?: string;
    isActive?: boolean;
    isPublic?: boolean;
    expiresAt?: Date | null;
    slug: string;
  }) =>
    prisma.$transaction(async (tx) => {
      const survey = await tx.survey.create({ data });
      const categories = await tx.category.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
      if (categories.length > 0) {
        await tx.surveyCategory.createMany({
          data: categories.map((c, idx) => ({
            surveyId: survey.id,
            categoryId: c.id,
            order: idx,
          })),
        });
      }
      return survey;
    }),

  update: (
    id: number,
    data: {
      title?: string;
      description?: string | null;
      isActive?: boolean;
      isPublic?: boolean;
      expiresAt?: Date | null;
      slug?: string;
    },
  ) => prisma.survey.update({ where: { id }, data }),

  delete: (id: number) => prisma.survey.delete({ where: { id } }),
};