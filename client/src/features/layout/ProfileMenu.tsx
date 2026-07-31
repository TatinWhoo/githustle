import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const initials = (user?.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open profile menu"
        className="w-8 h-8 rounded-full bg-gh-teal flex items-center justify-center font-bold text-xs cursor-pointer text-white border border-white/10"
      >
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-elevated py-1 text-xs text-text-primary z-50 font-sans"
          >
            <div className="p-3 border-b border-border">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-[10px] text-text-muted mt-0.5 capitalize">{user?.role}</p>
            </div>
            <div className="p-1">
              <button onClick={() => { navigate('/profile'); setOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-0 rounded transition font-bold text-gh-teal">View Profile</button>
              <button onClick={() => { void logout(); setOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-surface-0 rounded text-gh-red transition">Sign Out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
