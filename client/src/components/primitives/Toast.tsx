import { useEffect } from 'react';
import { motion } from 'motion/react';
import type { Toast as ToastType } from '@/stores/ui.store';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function Toast({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  const rm = useReducedMotion();
  useEffect(() => {
    if (toast.disableAutoDismiss) return;
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, toast.disableAutoDismiss, onDismiss]);

  const intent = toast.intent ?? (toast.variant === 'error' ? 'error' : toast.variant === 'success' ? 'success' : 'info');
  const color = intent === 'error' ? 'bg-gh-red' : intent === 'success' ? 'bg-gh-green' : intent === 'warning' ? 'bg-gh-amber' : 'bg-gh-ink2';

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: rm ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: rm ? 0 : 12 }}
      transition={{ duration: rm ? 0.08 : 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={`${color} text-white text-xs font-sans px-4 py-2.5 rounded-lg shadow-elevated flex items-center gap-3`}
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action?.onClick(); onDismiss(toast.id); }}
          className="underline underline-offset-2 font-semibold"
        >
          {toast.action.label}
        </button>
      )}
    </motion.div>
  );
}
