import { CaretRight } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useUiStore } from '@/stores/ui.store';
import type { UserRole } from '@/types/user';
import { NavItem } from './NavItem';
import { primaryNav, utilityNav } from './navConfig';

export function Sidebar({ role }: { role: UserRole }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const { pathname } = useLocation();
  const items = primaryNav.filter((n) => !n.adminOnly || role === 'admin');

  return (
    <motion.aside
      layout
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={`hidden lg:flex flex-col shrink-0 bg-gh-ink2 border-r border-white/5 text-white/90 ${collapsed ? 'w-14' : 'w-56'}`}
    >
      <div className="p-3 flex justify-between items-center border-b border-white/5">
        {!collapsed && <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-white/30">Workspace Menu</span>}
        <button onClick={toggle} aria-label="Toggle sidebar" className="p-1 text-white/40 hover:text-white rounded hover:bg-white/5 ml-auto cursor-pointer">
          <CaretRight size={14} className={`transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto relative">
        {items.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={collapsed} isActive={pathname === n.to} />)}
        <div className="my-2 mx-2 border-t border-white/5" />
        {utilityNav.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={collapsed} isActive={pathname === n.to} />)}
      </nav>
    </motion.aside>
  );
}
