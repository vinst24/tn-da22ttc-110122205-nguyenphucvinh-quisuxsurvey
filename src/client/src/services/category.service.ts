import { api } from '../api/http';
import type { ApiResponse } from '../types/api';
import { unwrap } from '../types/api';
import type { CategoryDto } from '../types/survey';

export const categoryService = {
  listBySurvey: async (surveyId: string) => {
    const { data } = await api.get<ApiResponse<CategoryDto[]>>('/categories', { params: { surveyId } });
    return unwrap(data);
  },

  create: async (input: { surveyId: string; name: string; description?: string; order?: number }) => {
    const { data } = await api.post<ApiResponse<CategoryDto>>('/categories', input);
    return unwrap(data);
  },

  update: async (id: string, input: { name?: string; description?: string; order?: number }) => {
    const { data } = await api.put<ApiResponse<CategoryDto>>(`/categories/${id}`, input);
    return unwrap(data);
  },

  remove: async (id: string) => {
    await api.delete(`/categories/${id}`);
  },
};

