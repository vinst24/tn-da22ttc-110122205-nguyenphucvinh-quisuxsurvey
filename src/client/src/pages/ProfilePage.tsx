import { zodResolver } from '@hookform/resolvers/zod';
import { Button, MenuItem, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { LoadingScreen } from '../components/LoadingScreen';
import { PATHS } from '../constants/paths';
import { SPECIALTY_FIELD_LABEL, SPECIALTY_OPTIONS } from '../constants/specialties';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { authService } from '../services/auth.service';
import { changePasswordSchema, profileSchema } from '../validators/auth';

export type ProfileValues = z.infer<typeof profileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const ProfilePage = () => {
  const { user, participant, loading, updateProfile } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', email: '', specialty: '' },
    mode: 'onBlur',
  });

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName ?? '',
        email: user.email,
        specialty: participant?.major ?? participant?.specialty ?? '',
      });
    }
  }, [participant?.major, participant?.specialty, profileForm, user]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(PATHS.HOME);
  };

  if (loading) return <LoadingScreen />;
  if (!user) return null;

  const handleProfileSave = profileForm.handleSubmit(async (values) => {
    try {
      await updateProfile({
        fullName: values.fullName?.trim() || undefined,
        email: values.email.trim(),
        specialty: values.specialty || null,
      });
      setEditing(false);
      notify('Cập nhật thông tin thành công.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Cập nhật không thành công', 'error');
    }
  });

  const handleCancelEdit = () => {
    profileForm.reset({
      fullName: user.fullName ?? '',
      email: user.email,
      specialty: participant?.major ?? participant?.specialty ?? '',
    });
    setEditing(false);
  };

  const handleChangePassword = passwordForm.handleSubmit(async (values) => {
    try {
      await authService.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      passwordForm.reset();
      notify('Đổi mật khẩu thành công.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Đổi mật khẩu không thành công', 'error');
    }
  });

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">Tài khoản của tôi</h1>
        <Button variant="outlined" onClick={handleBack}>
          Quay lại
        </Button>
      </div>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold">Thông tin cá nhân</h2>
            <p className="text-slate-500">Cập nhật email, họ tên và lĩnh vực chuyên môn của bạn.</p>
          </div>
          <div className="flex gap-3">
            {editing ? (
              <>
                <Button variant="outlined" onClick={handleCancelEdit}>
                  Hủy
                </Button>
                <Button variant="contained" onClick={handleProfileSave}>
                  Lưu thay đổi
                </Button>
              </>
            ) : (
              <Button variant="contained" onClick={() => setEditing(true)}>
                Chỉnh sửa
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <TextField
            label="Họ và tên"
            fullWidth
            disabled={!editing}
            {...profileForm.register('fullName')}
            error={Boolean(profileForm.formState.errors.fullName)}
            helperText={profileForm.formState.errors.fullName?.message}
          />
          <TextField
            label="Email"
            fullWidth
            disabled={!editing}
            {...profileForm.register('email')}
            error={Boolean(profileForm.formState.errors.email)}
            helperText={profileForm.formState.errors.email?.message}
          />
          <TextField
            select
            label={SPECIALTY_FIELD_LABEL}
            fullWidth
            disabled={!editing}
            value={profileForm.watch('specialty') ?? ''}
            {...profileForm.register('specialty')}
            error={Boolean(profileForm.formState.errors.specialty)}
            helperText={profileForm.formState.errors.specialty?.message}
          >
            <MenuItem value="">Chưa cung cấp</MenuItem>
            {SPECIALTY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold">Đổi mật khẩu</h2>
            <p className="text-slate-500">Cập nhật mật khẩu để tăng cường bảo mật.</p>
          </div>
          <Button variant="contained" onClick={handleChangePassword}>
            Lưu mật khẩu
          </Button>
        </div>

        <div className="grid gap-4">
          <TextField
            label="Mật khẩu hiện tại"
            type="password"
            fullWidth
            {...passwordForm.register('currentPassword')}
            error={Boolean(passwordForm.formState.errors.currentPassword)}
            helperText={passwordForm.formState.errors.currentPassword?.message}
          />
          <TextField
            label="Mật khẩu mới"
            type="password"
            fullWidth
            {...passwordForm.register('newPassword')}
            error={Boolean(passwordForm.formState.errors.newPassword)}
            helperText={passwordForm.formState.errors.newPassword?.message}
          />
          <TextField
            label="Xác nhận mật khẩu mới"
            type="password"
            fullWidth
            {...passwordForm.register('confirmPassword')}
            error={Boolean(passwordForm.formState.errors.confirmPassword)}
            helperText={passwordForm.formState.errors.confirmPassword?.message}
          />
        </div>
      </section>
    </div>
  );
};
