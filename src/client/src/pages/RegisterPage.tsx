import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box } from '@mui/material';
import { BarChart3, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FieldHint, FieldLabel, InputIcon } from '../components/FormControls';
import { PATHS } from '../constants/paths';
import { useAuth } from '../contexts/AuthContext';
import { extractApiErrorMessage } from '../types/api';
import { registerSchemaWithConfirm, type RegisterValues } from '../validators/auth';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchemaWithConfirm),
    defaultValues: { email: '', password: '', confirmPassword: '', fullName: '' },
    mode: 'onBlur',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const { email, password, fullName } = values;
      const user = await registerUser({ email, password, fullName });
      navigate(user.role === 'ADMIN' ? PATHS.ADMIN_DASHBOARD : PATHS.SURVEY);
    } catch (e) {
      const msg = extractApiErrorMessage(e, 'Đăng ký không thành công');
      if (/email/i.test(msg)) {
        form.setError('email', { type: 'server', message: msg });
      }
      setError(msg);
    }
  });

  return (
    <Box className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <RouterLink to={PATHS.HOME} className="flex items-center justify-center gap-2 mb-8">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <span className="font-semibold text-xl text-slate-900">QUIS Survey System</span>
        </RouterLink>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Đăng ký tài khoản</h1>
            <p className="text-slate-600">Tạo tài khoản để quản lý khảo sát</p>
          </div>

          {error && (
            <div className="mb-6">
              <Alert severity="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <FieldLabel htmlFor="register-full-name">Họ và tên</FieldLabel>
              <div className="relative">
                <InputIcon>
                  <User className="w-5 h-5" />
                </InputIcon>
                <input
                  id="register-full-name"
                  type="text"
                  {...form.register('fullName')}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="Nguyễn Văn A"
                  aria-invalid={Boolean(form.formState.errors.fullName)}
                  aria-describedby={form.formState.errors.fullName?.message ? 'register-full-name-error' : undefined}
                />
              </div>
              {form.formState.errors.fullName?.message && (
                <FieldHint id="register-full-name-error" tone="error">{form.formState.errors.fullName.message}</FieldHint>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="register-email">Email</FieldLabel>
              <div className="relative">
                <InputIcon>
                  <Mail className="w-5 h-5" />
                </InputIcon>
                <input
                  id="register-email"
                  type="email"
                  {...form.register('email')}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="your.email@example.com"
                  required
                  aria-invalid={Boolean(form.formState.errors.email)}
                  aria-describedby={form.formState.errors.email?.message ? 'register-email-error' : undefined}
                />
              </div>
              {form.formState.errors.email?.message && (
                <FieldHint id="register-email-error" tone="error">{form.formState.errors.email.message}</FieldHint>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="register-password">Mật khẩu</FieldLabel>
              <div className="relative">
                <InputIcon>
                  <Lock className="w-5 h-5" />
                </InputIcon>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="**********"
                  required
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={form.formState.errors.password?.message ? 'register-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Ẩn hoặc hiện mật khẩu"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {form.formState.errors.password?.message && (
                <FieldHint id="register-password-error" tone="error">{form.formState.errors.password.message}</FieldHint>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="register-confirm-password">Nhập lại mật khẩu</FieldLabel>
              <div className="relative">
                <InputIcon>
                  <Lock className="w-5 h-5" />
                </InputIcon>
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('confirmPassword')}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="Nhập lại mật khẩu"
                  required
                  aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                  aria-describedby={form.formState.errors.confirmPassword?.message ? 'register-confirm-password-error' : undefined}
                />
              </div>
              {form.formState.errors.confirmPassword?.message && (
                <FieldHint id="register-confirm-password-error" tone="error">{form.formState.errors.confirmPassword.message}</FieldHint>
              )}
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đăng ký
            </button>
          </form>

          <div className="mt-4">
            <RouterLink to={PATHS.SURVEY} className="block text-center py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
              Tham gia với mã khảo sát
            </RouterLink>
          </div>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Đã có tài khoản?{' '}
              <RouterLink to={PATHS.LOGIN} className="text-blue-600 hover:text-blue-700 font-medium">
                Đăng nhập ngay
              </RouterLink>
            </p>
          </div>
        </div>
      </div>
    </Box>
  );
};
