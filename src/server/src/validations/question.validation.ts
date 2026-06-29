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

export const questionIdParams = z.object({
  id: zNumericId,
});

export const listByCategoryQuery = z.object({
  categoryId: zNumericId,
});

export const createQuestionBody = z.object({
  categoryId: zNumericId,
  content: z.string().min(3).max(1000),
  order: zIntOptional,
  globalOrder: zIntOptional,
  minScale: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (typeof v === 'string' && v.trim() !== '') return Number(v);
    return v;
  }, z.number().int().min(0).optional()),
  maxScale: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (typeof v === 'string' && v.trim() !== '') return Number(v);
    return v;
  }, z.number().int().min(0).optional()),
  isRequired: z.boolean().optional(),
});

export const updateQuestionBody = createQuestionBody.omit({ categoryId: true }).partial();
