import { List, MagnifyingGlass } from '@phosphor-icons/react';
import { useUiStore } from '@/stores/ui.store';
import { ProfileMenu } from './ProfileMenu';
import { RoleSimulator } from './RoleSimulator';
import { NotificationBell } from '@/components/primitives/NotificationBell';
import { useCommandPalette } from '@/components/primitives/CommandPalette';

export function TopNav() {
  const setDrawer = useUiStore((s) => s.setMobileDrawer);
  const drawerOpen = useUiStore((s) => s.mobileDrawerOpen);
  const palette = useCommandPalette();

  return (
    <header className="h-[56px] bg-gh-ink border-b border-white/5 text-white sticky top-0 z-50 shrink-0 backdrop-blur">
      <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawer(!drawerOpen)} className="lg:hidden text-white/80 hover:text-white p-1 rounded cursor-pointer" aria-label="Toggle menu">
            <List size={22} weight="bold" />
          </button>
          <div className="flex items-center gap-1">
            <span className="font-display font-semibold text-lg tracking-tight">Git</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gh-teal" />
            <span className="font-display font-light text-lg tracking-tight text-white/90">Hustle</span>
          </div>
        </div>
        <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
          <button
            onClick={() => palette.open()}
            className="w-full text-left text-xs font-sans pl-9 pr-3 py-1.5 bg-white/8 border border-white/10 rounded-md placeholder-white/40 text-white/60 hover:text-white focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal"
            aria-label="Search — opens command palette"
          >
            Search contracts, skills, docs… <span className="text-white/40">⌘K</span>
          </button>
          <MagnifyingGlass size={16} className="text-white/40 absolute left-3 top-2.5" />
        </div>
        <div className="flex items-center gap-4">
          <RoleSimulator />
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
