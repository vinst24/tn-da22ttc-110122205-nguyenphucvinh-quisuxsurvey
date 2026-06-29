import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { compareSurveyAnalytics, exportSurveyAnalytics, surveyAnalytics, surveysSummary } from '../controllers/dashboard.controller.js';
import { analyticsCompareQuery, analyticsExportQuery, surveyIdQuery, surveysSummaryQuery } from '../validations/dashboard.validation.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/dashboard/surveys',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: surveysSummaryQuery }),
  surveysSummary,
);

dashboardRouter.get(
  '/dashboard/analytics/compare',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: analyticsCompareQuery }),
  compareSurveyAnalytics,
);

dashboardRouter.get(
  '/dashboard/analytics',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: surveyIdQuery }),
  surveyAnalytics,
);

dashboardRouter.get(
  '/admin/analytics/export',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: analyticsExportQuery }),
  exportSurveyAnalytics,
);
