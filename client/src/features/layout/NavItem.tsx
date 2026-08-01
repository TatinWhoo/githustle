import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import type { Icon } from '@phosphor-icons/react';

interface NavItemProps { to: string; label: string; icon: Icon; collapsed: boolean; isActive?: boolean; onNavigate?: () => void }

export function NavItem({ to, label, icon: Icon, collapsed, isActive, onNavigate }: NavItemProps) {
  return (
    <NavLink to={to} onClick={onNavigate} className="relative">
      {({ isActive: navActive }) => {
        const active = isActive ?? navActive;
        return (
          <div className={`relative flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${active ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            {active && (
              <motion.span
                layoutId="sidebarActive"
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="absolute inset-0 rounded-md bg-white/10 -z-0"
                aria-hidden
              />
            )}
            <Icon size={16} weight={active ? 'fill' : 'regular'} className="relative z-10" />
            {!collapsed && <span className="relative z-10 font-medium">{label}</span>}
          </div>
        );
      }}
    </NavLink>
  );
}
