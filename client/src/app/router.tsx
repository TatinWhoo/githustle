import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { AppShell } from '@/features/layout/AppShell';
import { RouteFallback } from './RouteFallback';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

// Each of these placeholder lazy stubs will be replaced with real pages in feature waves.





// Lazy wrappers so the future real modules can be swapped in later waves by replacing the import().
const HubPage = lazy(() => import('@/features/hub/pages/HubPage').then((m) => ({ default: m.HubPage })));
const ConversationsPage = lazy(() => import('@/features/conversations/pages/ConversationsPage').then((m) => ({ default: m.ConversationsPage })));
const PersonalPage = lazy(() => import('@/features/personal/pages/PersonalPage').then((m) => ({ default: m.PersonalPage })));
const LiveHubPage = lazy(() => import('@/features/live/pages/LiveHubPage').then((m) => ({ default: m.LiveHubPage })));
const LiveWorkspacePage = lazy(() => import('@/features/live/pages/LiveWorkspacePage').then((m) => ({ default: m.LiveWorkspacePage })));
const SavedPage = lazy(() => import('@/features/saved/pages/SavedPage').then((m) => ({ default: m.SavedPage })));
const AdminPage = lazy(() => import('@/features/admin/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PremiumPage = lazy(() => import('@/features/premium/pages/PremiumPage').then((m) => ({ default: m.PremiumPage })));
const HelpPage = lazy(() => import('@/features/help/pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const lazyEl = (Node: React.ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <Node />
  </Suspense>
);

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/hub" replace /> },
          { path: '/hub', element: lazyEl(HubPage) },
          { path: '/conversations', element: lazyEl(ConversationsPage) },
          { path: '/personal', element: lazyEl(PersonalPage) },
          { path: '/live', element: lazyEl(LiveHubPage) },
          { path: '/live/:projectId', element: lazyEl(LiveWorkspacePage) },
          { path: '/saved', element: lazyEl(SavedPage) },
          { path: '/profile', element: lazyEl(ProfilePage) },
          { path: '/premium', element: lazyEl(PremiumPage) },
          { path: '/help', element: lazyEl(HelpPage) },
          { path: '/settings', element: lazyEl(SettingsPage) },
          {
            element: <RoleRoute role="admin" />,
            children: [{ path: '/admin', element: lazyEl(AdminPage) }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/hub" replace /> },
]);
