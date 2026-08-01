import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { useUiStore } from '@/stores/ui.store';
import type { UserRole } from '@/types/user';
import { NavItem } from './NavItem';
import { RoleSimulator } from './RoleSimulator';
import { primaryNav, utilityNav } from './navConfig';

export function MobileDrawer({ role }: { role: UserRole }) {
  const open = useUiStore((s) => s.mobileDrawerOpen);
  const setOpen = useUiStore((s) => s.setMobileDrawer);
  const location = useLocation();
  const items = primaryNav.filter((n) => !n.adminOnly || role === 'admin');

  useEffect(() => { setOpen(false); }, [location.pathname, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 bg-black z-40 lg:hidden" />
          <motion.aside
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 bottom-0 left-0 w-64 bg-gh-ink2 text-white z-50 p-4 flex flex-col gap-4 lg:hidden overflow-y-auto backdrop-blur"
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="font-sans font-semibold text-sm">GitHustle</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 cursor-pointer"><X size={18} /></button>
            </div>
            <RoleSimulator />
            <div className="space-y-1">
              {items.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={false} onNavigate={() => setOpen(false)} />)}
              <div className="my-2 border-t border-white/10" />
              {utilityNav.map((n) => <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={false} onNavigate={() => setOpen(false)} />)}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
