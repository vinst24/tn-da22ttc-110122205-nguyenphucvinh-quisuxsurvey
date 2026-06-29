import { z } from 'zod';

const zNumericId = z.preprocess((v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return v;
}, z.string().regex(/^[0-9]+$/));

/** Accepts both numeric IDs ("12") and slug strings ("khao-sat-trai-nghiem-ux"). */
const zSurveyId = z.preprocess((v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return v;
}, z.string().min(1));

export const specialtyValues = [
  'INFORMATION_TECHNOLOGY',
  'BUSINESS_MANAGEMENT',
  'ENGINEERING',
  'HEALTHCARE',
  'EDUCATION',
  'MARKETING_COMMUNICATION',
  'UX_DESIGN',
  'FINANCE_ACCOUNTING',
  'LAW',
  'ARCHITECTURE',
  'MEDIA_JOURNALISM',
  'OTHER',
] as const;

export const submitResponseBody = z.object({
  surveyId: zSurveyId,
  details: z
    .array(
      z.object({
        questionId: zNumericId,
        score: z.number().int().min(1).max(9),
      }),
    )
    .min(1),
  overallFeedback: z.string().max(2000).optional(),
  token: z.string().min(4).optional(),
  guest: z
    .object({
      fullName: z.string().max(120).optional(),
      email: z.string().email().optional(),
      specialty: z.enum(specialtyValues).optional(),
      major: z.enum(specialtyValues).optional(),
    })
    .optional(),
});

export const saveDraftBody = z.object({
  surveyId: zSurveyId,
  responseId: zNumericId.optional(),
  details: z.array(
    z.object({
      questionId: zNumericId,
      score: z.number().int().min(1).max(9),
    }),
  ),
  overallFeedback: z.string().max(2000).optional(),
  token: z.string().min(4).optional(),
  guest: z
    .object({
      fullName: z.string().max(120).optional(),
      email: z.string().email().optional(),
      specialty: z.enum(specialtyValues).optional(),
      major: z.enum(specialtyValues).optional(),
    })
    .optional(),
});

export const completeResponseBody = z.object({
  surveyId: zSurveyId,
  responseId: zNumericId.optional(),
  details: z
    .array(
      z.object({
        questionId: zNumericId,
        score: z.number().int().min(1).max(9),
      }),
    )
    .min(1),
  overallFeedback: z.string().max(2000).optional(),
  token: z.string().min(4).optional(),
  guest: z
    .object({
      fullName: z.string().max(120).optional(),
      email: z.string().email().optional(),
      specialty: z.enum(specialtyValues).optional(),
      major: z.enum(specialtyValues).optional(),
    })
    .optional(),
});

export const draftQuery = z.object({
  surveyId: zSurveyId,
});


export const listMyResponsesQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
export const myResponseHistoryParams = z.object({
  surveyId: zSurveyId,
});
export const listResponsesQuery = z.object({
  surveyId: zSurveyId,
  page: z.string().optional(),
  pageSize: z.string().optional(),
  includePartial: z.enum(['true', 'false']).optional(),
});

export const cleanupDraftsBody = z.object({
  surveyId: zNumericId.optional(),
  minAgeDays: z.number().int().min(0).max(365).optional(),
});
