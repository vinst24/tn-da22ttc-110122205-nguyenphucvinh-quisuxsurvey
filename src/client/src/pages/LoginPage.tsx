import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box } from '@mui/material';
import { BarChart3, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { FieldHint, FieldLabel, InputIcon } from '../components/FormControls';
import { PATHS } from '../constants/paths';
import { useAuth } from '../contexts/AuthContext';
import { extractApiErrorMessage } from '../types/api';
import { loginSchema, type LoginValues } from '../validators/auth';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    form.clearErrors();
    try {
      const user = await login(values);
      const state = location.state as { from?: string } | null;
      const from = user.role === 'ADMIN' ? PATHS.ADMIN_DASHBOARD : state?.from ?? PATHS.SURVEY;
      navigate(from);
    } catch (e) {
      const msg = extractApiErrorMessage(e, 'Đăng nhập không thành công');
      if (/email|tài khoản/i.test(msg)) {
        form.setError('email', { type: 'server', message: msg });
      } else if (/mật khẩu|password/i.test(msg)) {
        form.setError('password', { type: 'server', message: msg });
      }
      setError(msg);
    }
  });

  return (
    <Box className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <RouterLink to={PATHS.HOME} className="flex items-center justify-center gap-2 mb-8">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <span className="font-semibold text-xl text-slate-900">Hệ thống khảo sát QUIS</span>
        </RouterLink>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Đăng nhập</h1>
            <p className="text-slate-600">Chào mừng bạn quay lại</p>
          </div>

          {error && (
            <div className="mb-6">
              <Alert severity="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <div className="relative">
                <InputIcon>
                  <Mail className="w-5 h-5" />
                </InputIcon>
                <input
                  id="login-email"
                  type="email"
                  {...form.register('email')}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="your.email@example.com"
                  required
                  aria-invalid={Boolean(form.formState.errors.email)}
                  aria-describedby={form.formState.errors.email?.message ? 'login-email-error' : undefined}
                />
              </div>
              {form.formState.errors.email?.message && (
                <FieldHint id="login-email-error" tone="error">{form.formState.errors.email.message}</FieldHint>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="login-password">Mật khẩu</FieldLabel>
              <div className="relative">
                <InputIcon>
                  <Lock className="w-5 h-5" />
                </InputIcon>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="**********"
                  required
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={form.formState.errors.password?.message ? 'login-password-error' : undefined}
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
                <FieldHint id="login-password-error" tone="error">{form.formState.errors.password.message}</FieldHint>
              )}
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đăng nhập
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Chưa có tài khoản?{' '}
              <RouterLink to={PATHS.REGISTER} className="text-blue-600 hover:text-blue-700 font-medium">
                Đăng ký ngay
              </RouterLink>
            </p>
          </div>

          <RouterLink
            to={PATHS.SURVEY}
            className="block text-center py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium mt-6"
          >
            Tham gia với mã khảo sát
          </RouterLink>
        </div>
      </div>
    </Box>
  );
};
