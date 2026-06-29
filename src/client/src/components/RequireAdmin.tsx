import { Navigate, Outlet } from 'react-router-dom';
import { PATHS } from '../constants/paths';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

export const RequireAdmin = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={PATHS.LOGIN} replace />;
  if (user.role !== 'ADMIN') return <Navigate to={PATHS.HOME} replace />;
  return <Outlet />;
};

