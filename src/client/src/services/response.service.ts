import { api } from '../api/http';
import type { SpecialtyValue } from '../constants/specialties';
import type { ApiResponse } from '../types/api';
import { unwrap } from '../types/api';
import type {
  DraftDto,
  MyResponseAttemptDto,
  MySurveyHistorySummaryDto,
  ResponseListItemDto,
  SaveDraftResultDto,
  SubmitResponseResultDto,
} from '../types/response';

export type SubmitResponseInput = {
  surveyId: string;
  details: { questionId: string; score: number }[];
  overallFeedback?: string;
  token?: string;
  guest?: { fullName?: string; email?: string; major?: SpecialtyValue };
  guestCode?: string;
};

export type SaveDraftInput = SubmitResponseInput & { responseId?: string };

export type CompleteResponseInput = SubmitResponseInput & { responseId?: string };

export const responseService = {
  submit: async (input: SubmitResponseInput) => {
    const { data } = await api.post<ApiResponse<SubmitResponseResultDto>>('/responses', input);
    return unwrap(data);
  },

  getDraft: async (surveyId: string): Promise<DraftDto | null> => {
    const { data } = await api.get<ApiResponse<DraftDto | null>>('/responses/draft', {
      params: { surveyId },
    });
    return unwrap(data);
  },

  saveDraft: async (input: SaveDraftInput) => {
    const { data } = await api.post<ApiResponse<SaveDraftResultDto>>('/responses/draft', input);
    return unwrap(data);
  },

  discardDraft: async (surveyId: string) => {
    const { data } = await api.delete<ApiResponse<{ discarded: boolean }>>('/responses/draft', {
      params: { surveyId },
    });
    return unwrap(data);
  },

  complete: async (input: CompleteResponseInput) => {
    const { data } = await api.post<ApiResponse<SubmitResponseResultDto>>('/responses/complete', input);
    return unwrap(data);
  },

  list: async (
    surveyId: string,
    page = 1,
    pageSize = 20,
    opts: { includePartial?: boolean } = {},
  ) => {
    const { data } = await api.get<ApiResponse<ResponseListItemDto[]>>('/responses', {
      params: {
        surveyId,
        page,
        pageSize,
        ...(opts.includePartial ? { includePartial: 'true' } : {}),
      },
    });
    return { items: unwrap(data), meta: data.success ? data.meta : undefined };
  },

  listMine: async (page = 1, pageSize = 10) => {
    const { data } = await api.get<ApiResponse<MySurveyHistorySummaryDto[]>>('/responses/me', {
      params: { page, pageSize },
    });
    return { items: unwrap(data), meta: data.success ? data.meta : undefined };
  },
  history: async (surveyId: string) => {
    const { data } = await api.get<ApiResponse<MyResponseAttemptDto[]>>(
      `/responses/me/${encodeURIComponent(surveyId)}/history`,
    );
    return unwrap(data);
  },

  cleanupDrafts: async (opts: { surveyId?: string; minAgeDays?: number } = {}) => {
    const { data } = await api.delete<ApiResponse<{ count: number }>>(
      '/admin/responses/drafts/cleanup',
      {
        data: {
          ...(opts.surveyId ? { surveyId: opts.surveyId } : {}),
          ...(opts.minAgeDays !== undefined ? { minAgeDays: opts.minAgeDays } : {}),
        },
      },
    );
    return unwrap(data);
  },
};
