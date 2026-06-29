import { z } from 'zod';
import { specialtyValues } from './response.validation.js';

export const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120).optional(),
});

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const profileBody = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).max(120).optional(),
  specialty: z.enum(specialtyValues).nullable().optional(),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});
