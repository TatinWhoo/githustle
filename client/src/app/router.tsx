import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { AppShell } from '@/features/layout/AppShell';
import { PlaceholderPage } from '@/features/layout/PlaceholderPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

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
          { path: '/hub', element: <PlaceholderPage title="Public Hub" /> },
          { path: '/conversations', element: <PlaceholderPage title="Conversations" /> },
          { path: '/personal', element: <PlaceholderPage title="Personal Space" /> },
          { path: '/live', element: <PlaceholderPage title="Live Workspaces" /> },
          { path: '/saved', element: <PlaceholderPage title="Saved Posts" /> },
          { path: '/profile', element: <PlaceholderPage title="Profile" /> },
          { path: '/premium', element: <PlaceholderPage title="Premium" /> },
          { path: '/help', element: <PlaceholderPage title="Help" /> },
          { path: '/settings', element: <PlaceholderPage title="Settings" /> },
          {
            element: <RoleRoute role="admin" />,
            children: [{ path: '/admin', element: <PlaceholderPage title="Admin Desk" /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/hub" replace /> },
]);
