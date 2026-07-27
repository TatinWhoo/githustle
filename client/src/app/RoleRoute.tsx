import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { UserRole } from '@/types/user';

export function RoleRoute({ role }: { role: UserRole }) {
  const { role: current, status } = useAuth();
  if (status === 'loading') return null;
  if (current !== role) return <Navigate to="/hub" replace />;
  return <Outlet />;
}
