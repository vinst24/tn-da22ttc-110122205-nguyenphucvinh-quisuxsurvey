import { z } from 'zod';
import { specialtyValues } from './response.validation.js';

const zNumericId = z.preprocess((v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return v;
}, z.string().regex(/^[0-9]+$/));

const analyticsFilters = {
  includePartial: z.enum(['true', 'false']).optional(),
  specialty: z.enum(specialtyValues).optional(),
  participationType: z.enum(['guest', 'registered']).optional(),
  status: z.enum(['completed', 'partial', 'all']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
};

export const surveyIdQuery = z.object({
  surveyId: zNumericId,
  ...analyticsFilters,
});

export const analyticsCompareQuery = surveyIdQuery.extend({
  groupA: z.enum(specialtyValues),
  groupB: z.enum(specialtyValues),
});

export const analyticsExportQuery = surveyIdQuery.extend({
  format: z.enum(['pdf', 'csv']).default('pdf'),
});

export const surveysSummaryQuery = z.object({
  includePartial: z.enum(['true', 'false']).optional(),
});
