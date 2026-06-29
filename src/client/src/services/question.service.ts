import { api } from '../api/http';
import type { ApiResponse } from '../types/api';
import { unwrap } from '../types/api';
import type { QuestionDto } from '../types/survey';

export const questionService = {
  listByCategory: async (categoryId: string) => {
    const { data } = await api.get<ApiResponse<QuestionDto[]>>('/questions', { params: { categoryId } });
    return unwrap(data);
  },

  create: async (input: { categoryId: string; content: string; order?: number; isRequired?: boolean }) => {
    const { data } = await api.post<ApiResponse<QuestionDto>>('/questions', input);
    return unwrap(data);
  },

  update: async (id: string, input: { content?: string; order?: number; isRequired?: boolean }) => {
    const { data } = await api.put<ApiResponse<QuestionDto>>(`/questions/${id}`, input);
    return unwrap(data);
  },

  remove: async (id: string) => {
    await api.delete(`/questions/${id}`);
  },
};

