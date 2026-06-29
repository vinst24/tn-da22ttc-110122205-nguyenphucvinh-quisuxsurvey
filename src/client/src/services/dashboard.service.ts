import { api } from '../api/http';
import type { ApiResponse } from '../types/api';
import { unwrap } from '../types/api';
import type { AnalyticsComparisonDto, AnalyticsDto, AnalyticsFilters, SurveySummaryDto } from '../types/dashboard';

const parseDownloadFilename = (contentDisposition?: string) => {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
};

const analyticsParams = (surveyId: string, opts: AnalyticsFilters = {}) => ({
  surveyId,
  ...(opts.includePartial ? { includePartial: 'true' } : {}),
  ...(opts.specialty ? { specialty: opts.specialty } : {}),
  ...(opts.participationType ? { participationType: opts.participationType } : {}),
  ...(opts.status ? { status: opts.status } : {}),
  ...(opts.dateFrom ? { dateFrom: opts.dateFrom } : {}),
  ...(opts.dateTo ? { dateTo: opts.dateTo } : {}),
});

export const dashboardService = {
  surveys: async (opts: { includePartial?: boolean } = {}) => {
    const { data } = await api.get<ApiResponse<SurveySummaryDto[]>>('/dashboard/surveys', {
      params: opts.includePartial ? { includePartial: 'true' } : undefined,
    });
    return unwrap(data);
  },

  analytics: async (surveyId: string, opts: AnalyticsFilters = {}) => {
    const { data } = await api.get<ApiResponse<AnalyticsDto>>('/dashboard/analytics', {
      params: analyticsParams(surveyId, opts),
    });
    return unwrap(data);
  },

  compareAnalytics: async (surveyId: string, groupA: string, groupB: string, opts: AnalyticsFilters = {}) => {
    const { data } = await api.get<ApiResponse<AnalyticsComparisonDto>>('/dashboard/analytics/compare', {
      params: {
        ...analyticsParams(surveyId, opts),
        groupA,
        groupB,
      },
    });
    return unwrap(data);
  },

  exportAnalytics: async (
    surveyId: string,
    format: 'pdf' | 'csv',
    opts: AnalyticsFilters = {},
  ) => {
    const response = await api.get<Blob>('/admin/analytics/export', {
      params: {
        ...analyticsParams(surveyId, opts),
        format,
      },
      responseType: 'blob',
    });

    return {
      blob: response.data,
      filename: parseDownloadFilename(response.headers['content-disposition']) ?? `analytics.${format}`,
    };
  },
};
