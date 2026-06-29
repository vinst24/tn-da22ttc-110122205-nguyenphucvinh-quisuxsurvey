import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PATHS } from '../constants/paths';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

export const RequireAuth = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={PATHS.LOGIN} replace state={{ from: location.pathname }} />;
  return <Outlet />;
};

