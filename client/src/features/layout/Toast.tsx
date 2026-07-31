import { useEffect } from 'react';
import { motion } from 'motion/react';
import type { Toast as ToastType } from '@/stores/ui.store';

export function Toast({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const color =
    toast.variant === 'error' ? 'bg-gh-red' : toast.variant === 'success' ? 'bg-gh-green' : 'bg-gh-ink2';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={`${color} text-white text-xs font-sans px-4 py-2.5 rounded-lg shadow-elevated`}
    >
      {toast.message}
    </motion.div>
  );
}
