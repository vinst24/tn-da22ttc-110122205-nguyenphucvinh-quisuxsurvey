import { z } from 'zod';
import { specialtyValues } from './response.validation.js';

const emptyToUndefined = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, z.string().trim().optional());

export const participantIdParams = z.object({
  id: z.string().regex(/^[0-9]+$/),
});

export const participantListQuery = z.object({
  page: z.preprocess((value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : undefined), z.number().int().positive().optional()),
  pageSize: z.preprocess((value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : undefined), z.number().int().positive().optional()),
  q: emptyToUndefined,
  isGuest: z.preprocess((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }, z.boolean().optional()),
  specialty: z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim() === '') return undefined;
      return value;
    },
    z.enum(specialtyValues).optional(),
  ),
  major: z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim() === '') return undefined;
      return value;
    },
    z.enum(specialtyValues).optional(),
  ),
  surveyId: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : undefined),
    z.number().int().positive().optional(),
  ),
  createdFrom: z.preprocess((value) => (typeof value === 'string' && value.trim() !== '' ? value : undefined), z.string().datetime().optional()),
  createdTo: z.preprocess((value) => (typeof value === 'string' && value.trim() !== '' ? value : undefined), z.string().datetime().optional()),
});
