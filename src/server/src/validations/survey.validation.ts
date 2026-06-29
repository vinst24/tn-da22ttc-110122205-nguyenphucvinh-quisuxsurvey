import { z } from 'zod';

export const surveyIdParams = z.object({
  id: z.string().regex(/^[0-9]+$/),
});

const ONE_HOUR_MS = 60 * 60 * 1000;

const expiresAtFutureMin1h = z
  .string()
  .datetime({ offset: true })
  .refine(
    (value) => new Date(value).getTime() > Date.now() + ONE_HOUR_MS,
    { message: 'Thời gian hết hạn phải lớn hơn thời điểm hiện tại ít nhất 1 giờ' },
  );

const expiresAtFuture = z
  .string()
  .datetime({ offset: true })
  .refine(
    (value) => new Date(value).getTime() > Date.now(),
    { message: 'Thời gian hết hạn phải ở tương lai' },
  );

export const createSurveyBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  expiresAt: expiresAtFutureMin1h.optional(),
});

export const updateSurveyBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  expiresAt: expiresAtFuture.optional(),
});

export const surveySlugParams = z.object({
  slug: z.string().min(1).max(240).refine((v) => !/^\d+$/.test(v), 'Slug không hợp lệ'),
});

export const takeSurveyQuery = z.object({
  token: z.string().trim().min(1).max(128).optional(),
});

export const listSurveysQuery = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  pageSize: z.string().regex(/^\d+$/).optional(),
  q: z.string().trim().max(200).optional(),
  status: z.enum(['active', 'blocked']).optional(),
  access: z.enum(['public', 'token']).optional(),
  sortBy: z.enum(['title', 'isActive', 'responses', 'expiresAt', 'createdAt']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

