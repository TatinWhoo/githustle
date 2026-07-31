import { AnimatePresence } from 'motion/react';
import { useUiStore } from '@/stores/ui.store';
import { Toast } from './Toast';

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={dismiss} />)}
      </AnimatePresence>
    </div>
  );
}
