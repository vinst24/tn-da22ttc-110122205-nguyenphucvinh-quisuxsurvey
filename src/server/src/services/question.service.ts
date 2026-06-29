import { questionRepo } from '../repositories/question.repo.js';
import { notFound } from '../utils/errors.js';

export const questionService = {
  listByCategory: (categoryId: string) => questionRepo.listByCategory(categoryId),

  getById: async (id: string) => {
    const question = await questionRepo.findById(id);
    if (!question) throw notFound('\u004b\u0068\u00f4ng t\u00ecm th\u1ea5y c\u00e2u h\u1ecfi');
    return question;
  },

  create: async (data: {
    categoryId: string;
    content: string;
    order?: number;
    globalOrder?: number;
    minScale?: number;
    maxScale?: number;
    isRequired?: boolean;
  }) => {
    const order =
      data.order ?? (await questionRepo.nextOrderByCategory(data.categoryId));
    const globalOrder =
      data.globalOrder ?? (await questionRepo.nextGlobalOrder());

    return questionRepo.create({
      categoryId: data.categoryId,
      content: data.content,
      order,
      globalOrder,
      minScale: data.minScale,
      maxScale: data.maxScale,
      isRequired: data.isRequired,
    });
  },

  update: async (
    id: string,
    data: {
      content?: string;
      order?: number;
      globalOrder?: number;
      minScale?: number;
      maxScale?: number;
      isRequired?: boolean;
    },
  ) => {
    await questionService.getById(id);
    return questionRepo.update(id, data);
  },

  delete: async (id: string) => {
    await questionService.getById(id);
    await questionRepo.delete(id);
  },
};
