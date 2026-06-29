import { categoryRepo } from '../repositories/category.repo.js';
import { notFound } from '../utils/errors.js';

export const categoryService = {
  listBySurvey: (surveyId: string) => categoryRepo.listBySurvey(surveyId),

  getById: async (id: string) => {
    const category = await categoryRepo.findById(id);
    if (!category) throw notFound('\u004b\u0068\u00f4ng t\u00ecm th\u1ea5y danh m\u1ee5c');
    return category;
  },

  create: async (data: { surveyId: string; name: string; description?: string; order?: number }) => {
    const orders =
      data.order === undefined ? await categoryRepo.listOrdersBySurvey(data.surveyId) : [];

    const nextOrder =
      data.order ??
      (orders.length ? Math.max(...orders.map((o) => (typeof o === 'number' ? o : -1))) + 1 : 0);

    return categoryRepo.createAndLink({
      surveyId: data.surveyId,
      name: data.name,
      description: data.description,
      order: nextOrder,
    });
  },

  update: async (id: string, data: { name?: string; description?: string; order?: number }) => {
    await categoryService.getById(id);
    const { order: _ignoredOrder, ...rest } = data;
    void _ignoredOrder;
    return categoryRepo.update(id, rest);
  },

  delete: async (id: string) => {
    await categoryService.getById(id);
    await categoryRepo.delete(id);
  },
};
