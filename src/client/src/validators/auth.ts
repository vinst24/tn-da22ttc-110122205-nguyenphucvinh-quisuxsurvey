import { z } from 'zod';
import { SPECIALTY_OPTIONS } from '../constants/specialties';

const emailMessage = 'Email không hợp lệ';
const passwordMinMessage = 'Mật khẩu phải ít nhất 8 ký tự';
const specialtyValues = SPECIALTY_OPTIONS.map((option) => option.value) as [
  (typeof SPECIALTY_OPTIONS)[number]['value'],
  ...(typeof SPECIALTY_OPTIONS)[number]['value'][],
];

export const loginSchema = z.object({
  email: z.string().email(emailMessage),
  password: z.string().min(8, passwordMinMessage),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên phải ít nhất 2 ký tự').max(120, 'Họ và tên không được quá 120 ký tự').optional(),
  email: z.string().email(emailMessage),
  password: z.string().min(8, passwordMinMessage),
  confirmPassword: z.string().min(8, 'Mật khẩu nhập lại phải ít nhất 8 ký tự'),
});

export type RegisterValues = z.infer<typeof registerSchema>;

export const registerSchemaWithConfirm = registerSchema.superRefine((val, ctx) => {
  if (val.password !== val.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mật khẩu không khớp', path: ['confirmPassword'] });
  }
});

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Họ và tên phải ít nhất 2 ký tự').max(120, 'Họ và tên không được quá 120 ký tự').optional(),
  email: z.string().email(emailMessage),
  specialty: z.enum(specialtyValues).or(z.literal('')).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Mật khẩu hiện tại phải ít nhất 8 ký tự'),
    newPassword: z.string().min(8, 'Mật khẩu mới phải ít nhất 8 ký tự'),
    confirmPassword: z.string().min(8, 'Xác nhận mật khẩu phải ít nhất 8 ký tự'),
  })
  .superRefine((val, ctx) => {
    if (val.newPassword !== val.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mật khẩu mới không khớp', path: ['confirmPassword'] });
    }
  });
