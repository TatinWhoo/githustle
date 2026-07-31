import { NavLink } from 'react-router-dom';
import type { Icon } from '@phosphor-icons/react';

interface NavItemProps {
  to: string;
  label: string;
  icon: Icon;
  collapsed: boolean;
  onNavigate?: () => void;
}

export function NavItem({ to, label, icon: IconCmp, collapsed, onNavigate }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-3 py-2 rounded-md font-sans font-medium text-xs tracking-wide transition cursor-pointer ${
          isActive
            ? 'bg-gh-teal/15 border-l-2 border-gh-teal text-gh-teal-light font-semibold'
            : 'text-white/65 hover:text-white hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <IconCmp size={18} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-gh-teal' : 'text-white/50'} />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
}
