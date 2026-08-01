import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '@/lib/query/keys';
import { fixtureStore } from '@/lib/fixtures/fixtureLoader';
import type { Notification as NotificationType } from '@/types/domain';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Notification } from './Notification';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rm = useReducedMotion();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data = [] } = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => fixtureStore.getNotifications(user?.id),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const unread = data.filter((n) => !n.is_read).length;

  function activate(n: NotificationType) {
    fixtureStore.markNotificationRead(n.id);
    qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    const route =
      n.entity_type === 'project' ? `/live/${n.entity_id}` :
      n.entity_type === 'job' ? `/hub?jobId=${n.entity_id}` :
      n.entity_type === 'dispute' ? `/admin` :
      n.entity_type === 'invoice' ? `/live` :
      '/hub';
    nav(route);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button aria-label="Notifications" onClick={() => setOpen((v) => !v)} className="relative cursor-pointer group">
        <Bell size={20} className="text-white/70 group-hover:text-white transition" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-gh-red text-white text-[9px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: rm ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: rm ? 1 : 0.95 }}
            transition={{ duration: rm ? 0.08 : 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-elevated border border-border z-50 p-2"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-text-primary">Notifications</span>
              <button
                className="text-[11px] text-gh-teal hover:underline"
                onClick={() => {
                  if (user) fixtureStore.markAllNotificationsRead(user.id);
                  qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
                }}
              >
                Mark all read
              </button>
            </div>
            {data.length === 0 && (
              <div className="p-6 text-center text-xs text-text-muted">No notifications</div>
            )}
            {data.map((n) => (
              <Notification key={n.id} n={n} onActivate={activate} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
