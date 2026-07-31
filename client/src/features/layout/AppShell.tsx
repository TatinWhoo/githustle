import { Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { ToastHost } from './ToastHost';

export function AppShell() {
  const { role } = useAuth();
  const activeRole = role ?? 'freelancer';
  return (
    <div className="min-h-[100dvh] bg-surface-0 text-text-primary flex flex-col font-sans overflow-x-hidden antialiased">
      <TopNav />
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar role={activeRole} />
        <MobileDrawer role={activeRole} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  );
}
