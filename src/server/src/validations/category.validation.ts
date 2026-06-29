import { z } from 'zod';

const zNumericId = z.preprocess((v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return v;
}, z.string().regex(/^[0-9]+$/));

const zIntOptional = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return v;
}, z.number().int().min(0).optional());

export const categoryIdParams = z.object({
  id: zNumericId,
});

export const listBySurveyQuery = z.object({
  surveyId: zNumericId,
});

export const createCategoryBody = z.object({
  surveyId: zNumericId,
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  order: zIntOptional,
});

export const updateCategoryBody = createCategoryBody.omit({ surveyId: true }).partial();
