import { prisma } from '../prisma/client.js';

export const categoryRepo = {
  listBySurvey: async (surveyId: string) => {
    const rows = await prisma.surveyCategory.findMany({
      where: { surveyId: Number(surveyId) },
      orderBy: { order: 'asc' as const },
      include: { category: { include: { _count: { select: { questions: true } } } } },
    });
    return rows.map((r) => ({ ...r.category, order: r.order }));
  },

  listOrdersBySurvey: async (surveyId: string) => {
    const rows = await prisma.surveyCategory.findMany({
      where: { surveyId: Number(surveyId) },
      select: { order: true },
    });
    return rows.map((r) => r.order).filter((v): v is number => typeof v === 'number');
  },

  findById: (id: string) =>
    prisma.category.findUnique({
      where: { id: Number(id) },
      include: { questions: { orderBy: { order: 'asc' as const } } },
    }),

  createAndLink: (data: {
    surveyId: string;
    name: string;
    description?: string;
    order: number;
  }) =>
    prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: { name: data.name, description: data.description },
      });
      await tx.surveyCategory.create({
        data: {
          surveyId: Number(data.surveyId),
          categoryId: category.id,
          order: data.order,
        },
      });
      return { ...category, order: data.order };
    }),

  update: (id: string, data: { name?: string; description?: string }) =>
    prisma.category.update({ where: { id: Number(id) }, data }),

  delete: (id: string) =>
    prisma.$transaction([
      prisma.surveyCategory.deleteMany({ where: { categoryId: Number(id) } }),
      prisma.category.delete({ where: { id: Number(id) } }),
    ]),
};
