import { api } from '../api/http';
import type { ApiResponse } from '../types/api';
import { unwrap } from '../types/api';
import type {
  SurveyDetailDto,
  SurveyDto,
  SurveyListItemDto,
  SurveyTokenDto,
  SurveyTokenValidationDto,
} from '../types/survey';

export type SurveySortField = 'title' | 'isActive' | 'responses' | 'expiresAt' | 'createdAt';

export const surveyService = {
  list: async (opts?: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: 'active' | 'blocked';
    access?: 'public' | 'token';
    sortBy?: SurveySortField;
    sortDir?: 'asc' | 'desc';
  }) => {
    const params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageSize) params.pageSize = String(opts.pageSize);
    if (opts?.q) params.q = opts.q;
    if (opts?.status) params.status = opts.status;
    if (opts?.access) params.access = opts.access;
    if (opts?.sortBy) params.sortBy = opts.sortBy;
    if (opts?.sortDir) params.sortDir = opts.sortDir;
    const { data } = await api.get<ApiResponse<SurveyListItemDto[]>>('/surveys', {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    return { items: unwrap(data), meta: data.success ? data.meta : undefined };
  },

  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<SurveyDetailDto>>(`/surveys/${id}`);
    return unwrap(data);
  },

  getForTaking: async (id: string, token?: string) => {
    const { data } = await api.get<ApiResponse<SurveyDetailDto>>(`/surveys/${id}/take`, {
      params: token ? { token } : undefined,
    });
    return unwrap(data);
  },
  getByIdAdmin: async (id: string) => {
    const { data } = await api.get<ApiResponse<SurveyDetailDto>>(`/surveys/admin/${id}`);
    return unwrap(data);
  },

  create: async (input: { title: string; description?: string; isActive?: boolean; isPublic?: boolean; expiresAt?: string | null }) => {
    const { data } = await api.post<ApiResponse<SurveyDto>>('/surveys', input);
    return unwrap(data);
  },

  update: async (id: string, input: { title?: string; description?: string; isActive?: boolean; isPublic?: boolean; expiresAt?: string | null }) => {
    const { data } = await api.put<ApiResponse<SurveyDto>>(`/surveys/${id}`, input);
    return unwrap(data);
  },

  remove: async (id: string) => {
    await api.delete(`/surveys/${id}`);
  },

  createToken: async (id: string, opts?: { validFrom?: string; expiresAt?: string; codePrefix?: string; maxUsage?: number }) => {
    const { data } = await api.post<ApiResponse<{ id: string; token: string; tokens?: Array<{ id: string; token: string; expiresAt: string | null }>; expiresAt: string | null }>>(
      `/surveys/${id}/tokens`,
      {
        ...(opts?.validFrom ? { validFrom: opts.validFrom } : {}),
        ...(opts?.expiresAt ? { expiresAt: opts.expiresAt } : {}),
        ...(opts?.codePrefix ? { codePrefix: opts.codePrefix } : {}),
        ...(opts?.maxUsage !== undefined ? { maxUsage: opts.maxUsage } : {}),
      },
    );
    return unwrap(data);
  },

  listTokens: async (id: string) => {
    const { data } = await api.get<ApiResponse<SurveyTokenDto[]>>(`/surveys/${id}/tokens`);
    return unwrap(data);
  },

  removeToken: async (tokenId: string) => {
    await api.delete(`/tokens/${tokenId}`);
  },

  validateToken: async (code: string, surveyId: string) => {
    const { data } = await api.get<ApiResponse<SurveyTokenValidationDto>>(
      `/survey-tokens/${encodeURIComponent(code)}`,
      { params: { surveyId } },
    );
    return unwrap(data);
  },
};
