import { useEffect, useRef, lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUiStore } from '@/stores/ui.store';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { ToastHost } from '@/components/primitives/ToastHost';

const CommandPalette = lazy(() => import('@/components/primitives/CommandPalette').then((m) => ({ default: m.CommandPalette })));

export function AppShell() {
  const { role } = useAuth();
  const sim = useUiStore((s) => s.roleSimulator);
  const activeRole = sim.isSimulating && sim.simulatedRole ? sim.simulatedRole : (role ?? 'freelancer');
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const setOffline = useUiStore((s) => s.setOffline);
  const push = useUiStore((s) => s.pushToast);

  useEffect(() => { mainRef.current?.focus(); }, [location.pathname]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => { setOffline(true); push({ intent: 'warning', message: 'Offline — changes queued locally', disableAutoDismiss: true }); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [setOffline, push]);

  return (
    <div className="min-h-[100dvh] bg-surface-0 text-text-primary flex flex-col font-sans overflow-x-hidden antialiased">
      <a href="#main" className="sr-only focus:not-sr-only fixed top-2 left-2 z-[300] bg-white text-text-primary px-3 py-1 rounded shadow-elevated">Skip to content</a>
      <TopNav />
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar role={activeRole} />
        <MobileDrawer role={activeRole} />
        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 flex flex-col min-h-0 outline-none">
          <Outlet />
        </main>
      </div>
      <ToastHost />
      <Suspense fallback={null}><CommandPalette /></Suspense>
    </div>
  );
}
