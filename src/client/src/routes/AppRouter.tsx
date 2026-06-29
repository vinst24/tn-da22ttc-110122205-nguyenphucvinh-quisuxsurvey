import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingScreen } from '../components/LoadingScreen';
import { RequireAdmin } from '../components/RequireAdmin';
import { RequireAuth } from '../components/RequireAuth';
import { PATHS } from '../constants/paths';
import { AdminLayout } from '../layouts/AdminLayout';
import { LandingLayout } from '../layouts/LandingLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { HomePage } from '../pages/HomePage';

const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const MySurveysPage = lazy(() =>
  import('../pages/MySurveysPage').then((module) => ({ default: module.MySurveysPage })),
);
const ParticipantInfoPage = lazy(() =>
  import('../pages/ParticipantInfoPage').then((module) => ({ default: module.ParticipantInfoPage })),
);
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const RegisterPage = lazy(() => import('../pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const SurveyCodePage = lazy(() =>
  import('../pages/SurveyCodePage').then((module) => ({ default: module.SurveyCodePage })),
);
const SurveyDetailPage = lazy(() =>
  import('../pages/SurveyDetailPage').then((module) => ({ default: module.SurveyDetailPage })),
);
const SurveyPage = lazy(() => import('../pages/SurveyPage').then((module) => ({ default: module.SurveyPage })));
const SurveyResultPage = lazy(() =>
  import('../pages/SurveyResultPage').then((module) => ({ default: module.SurveyResultPage })),
);
const TakeSurveyPage = lazy(() =>
  import('../pages/TakeSurveyPage').then((module) => ({ default: module.TakeSurveyPage })),
);
const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })),
);
const AdminSurveysPage = lazy(() =>
  import('../pages/admin/AdminSurveysPage').then((module) => ({ default: module.AdminSurveysPage })),
);
const AnalyticsPage = lazy(() =>
  import('../pages/admin/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })),
);
const ManageCategoriesPage = lazy(() =>
  import('../pages/admin/ManageCategoriesPage').then((module) => ({ default: module.ManageCategoriesPage })),
);
const ManageQuestionsPage = lazy(() =>
  import('../pages/admin/ManageQuestionsPage').then((module) => ({ default: module.ManageQuestionsPage })),
);
const ParticipantsPage = lazy(() =>
  import('../pages/admin/ParticipantsPage').then((module) => ({ default: module.ParticipantsPage })),
);
const SurveyReportsPage = lazy(() =>
  import('../pages/admin/SurveyReportsPage').then((module) => ({ default: module.SurveyReportsPage })),
);
const TokensPage = lazy(() => import('../pages/admin/TokensPage'));

const withPageBoundary = (element: ReactNode, fallbackTitle?: string) => (
  <ErrorBoundary fallbackTitle={fallbackTitle}>{element}</ErrorBoundary>
);

const renderPublicRoute = (element: ReactNode, fallbackTitle?: string) => (
  <ErrorBoundary fallbackTitle={fallbackTitle}>
    <Suspense fallback={<LoadingScreen label={'\u0110ang t\u1ea3i trang...'} />}>{element}</Suspense>
  </ErrorBoundary>
);

const renderAdminRoute = (element: ReactNode) => (
  <ErrorBoundary fallbackTitle={'\u004bh\u00f4ng th\u1ec3 hi\u1ec3n th\u1ecb trang qu\u1ea3n tr\u1ecb'}>
    <Suspense fallback={<LoadingScreen label={'\u0110ang t\u1ea3i trang qu\u1ea3n tr\u1ecb...'} />}>{element}</Suspense>
  </ErrorBoundary>
);

export const AppRouter = () => {
  return (
    <Routes>
      <Route element={<LandingLayout />}>
        <Route path={PATHS.HOME} element={withPageBoundary(<HomePage />)} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path={PATHS.LOGIN} element={renderPublicRoute(<LoginPage />)} />
        <Route path={PATHS.REGISTER} element={renderPublicRoute(<RegisterPage />)} />
        <Route path={PATHS.SURVEY_CODE} element={renderPublicRoute(<SurveyCodePage />)} />
        <Route path={PATHS.PARTICIPANT_INFO} element={renderPublicRoute(<ParticipantInfoPage />)} />
        <Route path={PATHS.SURVEY_RESULT} element={renderPublicRoute(<SurveyResultPage />)} />
        <Route path="/surveys/:slug" element={renderPublicRoute(<SurveyDetailPage />)} />
        <Route path="/surveys/:slug/take" element={renderPublicRoute(<TakeSurveyPage />)} />
        <Route path={PATHS.SURVEY} element={renderPublicRoute(<SurveyPage />)} />

        <Route element={<RequireAuth />}>
          <Route path={PATHS.PROFILE} element={renderPublicRoute(<ProfilePage />)} />
          <Route path={PATHS.MY_SURVEYS} element={renderPublicRoute(<MySurveysPage />)} />
        </Route>
      </Route>

      <Route element={<RequireAdmin />}>
        <Route path={PATHS.ADMIN} element={<AdminLayout />}>
          <Route index element={<Navigate to={PATHS.ADMIN_DASHBOARD} replace />} />
          <Route path="dashboard" element={renderAdminRoute(<AdminDashboardPage />)} />
          <Route path="surveys" element={renderAdminRoute(<AdminSurveysPage />)} />
          <Route path="categories" element={renderAdminRoute(<ManageCategoriesPage />)} />
          <Route path="questions" element={renderAdminRoute(<ManageQuestionsPage />)} />
          <Route path="participants" element={renderAdminRoute(<ParticipantsPage />)} />
          <Route path="analytics" element={renderAdminRoute(<AnalyticsPage />)} />
          <Route path="tokens" element={renderAdminRoute(<TokensPage />)} />
          <Route path="reports" element={renderAdminRoute(<SurveyReportsPage />)} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={PATHS.HOME} replace />} />
    </Routes>
  );
};