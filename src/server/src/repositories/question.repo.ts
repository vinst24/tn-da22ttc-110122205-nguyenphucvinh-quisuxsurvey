import { prisma } from '../prisma/client.js';

export const questionRepo = {
  listByCategory: (categoryId: string) =>
    prisma.question.findMany({ where: { categoryId: Number(categoryId) }, orderBy: { order: 'asc' } }),

  nextOrderByCategory: async (categoryId: string) => {
    const last = await prisma.question.findFirst({
      where: { categoryId: Number(categoryId) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  },

  nextGlobalOrder: async () => {
    const last = await prisma.question.findFirst({
      orderBy: { globalOrder: 'desc' },
      select: { globalOrder: true },
    });
    return (last?.globalOrder ?? 0) + 1;
  },

  findById: (id: string) => prisma.question.findUnique({ where: { id: Number(id) } }),

  create: (data: {
    categoryId: string;
    content: string;
    order: number;
    globalOrder: number;
    minScale?: number;
    maxScale?: number;
    isRequired?: boolean;
  }) =>
    prisma.question.create({
      data: {
        categoryId: Number(data.categoryId),
        content: data.content,
        order: data.order,
        globalOrder: data.globalOrder,
        minScale: data.minScale,
        maxScale: data.maxScale,
        isRequired: data.isRequired,
      },
    }),

  update: (
    id: string,
    data: {
      content?: string;
      order?: number;
      globalOrder?: number;
      minScale?: number;
      maxScale?: number;
      isRequired?: boolean;
    },
  ) => prisma.question.update({ where: { id: Number(id) }, data }),

  delete: (id: string) => prisma.question.delete({ where: { id: Number(id) } }),
};
