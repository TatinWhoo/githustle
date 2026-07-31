import { List, MagnifyingGlass, Bell } from '@phosphor-icons/react';
import { useUiStore } from '@/stores/ui.store';
import { ProfileMenu } from './ProfileMenu';

export function TopNav() {
  const setDrawer = useUiStore((s) => s.setMobileDrawer);
  const drawerOpen = useUiStore((s) => s.mobileDrawerOpen);
  return (
    <header className="h-[56px] bg-gh-ink border-b border-white/5 text-white sticky top-0 z-50 shrink-0">
      <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawer(!drawerOpen)} className="lg:hidden text-white/80 hover:text-white p-1 rounded transition cursor-pointer" aria-label="Toggle menu">
            <List size={22} weight="bold" />
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sans font-semibold text-lg tracking-tight">Git</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gh-teal" />
            <span className="font-sans font-light text-lg tracking-tight text-white/90">Hustle</span>
          </div>
        </div>
        <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
          <input type="text" placeholder="Search contracts, skills, docs..." className="w-full text-xs font-sans pl-9 pr-3 py-1.5 bg-white/8 border border-white/10 rounded-md placeholder-white/40 text-white focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal transition" />
          <MagnifyingGlass size={16} className="text-white/40 absolute left-3 top-2.5" />
        </div>
        <div className="flex items-center gap-4">
          <button className="relative cursor-pointer group" aria-label="Notifications">
            <Bell size={20} className="text-white/70 group-hover:text-white transition" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gh-red rounded-full" />
          </button>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
