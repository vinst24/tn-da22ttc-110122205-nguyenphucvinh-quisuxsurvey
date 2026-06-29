import type { Specialty } from '@prisma/client';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { dashboardService, type AnalyticsFilterOptions } from '../services/dashboard.service.js';
import { analyticsExportService } from '../services/analytics-export.service.js';

const contentDispositionAttachment = (filename: string) => {
  const fallback = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/["\\;]/g, '-')
    .replace(/-+/g, '-')
    .trim() || 'analytics-export';
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

const analyticsFiltersFromQuery = (query: Record<string, unknown>): AnalyticsFilterOptions => ({
  includePartial: query.includePartial === 'true',
  specialty: query.specialty as Specialty | undefined,
  participationType: query.participationType === 'guest' || query.participationType === 'registered'
    ? query.participationType
    : undefined,
  status: query.status === 'completed' || query.status === 'partial' || query.status === 'all'
    ? query.status
    : undefined,
  dateFrom: typeof query.dateFrom === 'string' ? query.dateFrom : undefined,
  dateTo: typeof query.dateTo === 'string' ? query.dateTo : undefined,
});

export const surveyAnalytics: RequestHandler = asyncHandler(async (req, res) => {
  const result = await dashboardService.analyticsBySurvey(req.query.surveyId as string, analyticsFiltersFromQuery(req.query));
  const { status, body } = ok(result);
  res.status(status).json(body);
});

export const compareSurveyAnalytics: RequestHandler = asyncHandler(async (req, res) => {
  const result = await dashboardService.compareAnalyticsBySurvey(req.query.surveyId as string, {
    ...analyticsFiltersFromQuery(req.query),
    groupA: req.query.groupA as Specialty,
    groupB: req.query.groupB as Specialty,
  });
  const { status, body } = ok(result);
  res.status(status).json(body);
});

export const exportSurveyAnalytics: RequestHandler = asyncHandler(async (req, res) => {
  const format = req.query.format === 'csv' ? 'csv' : 'pdf';
  const result = await analyticsExportService.exportAnalytics({
    surveyId: req.query.surveyId as string,
    format,
    ...analyticsFiltersFromQuery(req.query),
  });

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', contentDispositionAttachment(result.filename));
  res.status(200).send(result.body);
});

export const surveysSummary: RequestHandler = asyncHandler(async (req, res) => {
  const includePartial = req.query.includePartial === 'true';
  const result = await dashboardService.surveysSummary({ includePartial });
  const { status, body } = ok(result);
  res.status(status).json(body);
});
