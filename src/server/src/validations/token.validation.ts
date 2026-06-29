import { z } from 'zod';

const tokenDateFuture = z
  .string()
  .datetime()
  .refine(
    (value) => new Date(value).getTime() > Date.now(),
    { message: 'Thời gian phải ở tương lai' },
  );

export const createTokenBody = z.object({
  validFrom: tokenDateFuture.optional(),
  expiresAt: tokenDateFuture.optional(),
  codePrefix: z.string().trim().max(9).optional(),
  maxUsage: z.number().int().min(1).max(1000).optional(),
  quantity: z.number().int().min(1).max(1000).optional(),
});

export const tokenCodeParams = z.object({
  code: z.string().min(1),
});

export const validateSurveyTokenQuery = z.object({
  surveyId: z.string().regex(/^[0-9]+$/),
});
