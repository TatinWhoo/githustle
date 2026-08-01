import { useEffect, useRef, useState, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface ConfirmDestructiveProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  holdDurationMs?: number;
  requireTypedConfirmation?: { prompt: string; expected: string };
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDestructive({
  isOpen, title, description, confirmLabel,
  holdDurationMs = 2000, requireTypedConfirmation, onConfirm, onCancel,
}: ConfirmDestructiveProps) {
  const rm = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const [typed, setTyped] = useState('');
  const [pressing, setPressing] = useState(false);
  const [fillPct, setFillPct] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const raf = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const lastThreshold = useRef<number>(0);

  const armed = requireTypedConfirmation ? typed === requireTypedConfirmation.expected : true;

  const cancel = useCallback(() => {
    setPressing(false); setFillPct(0); lastThreshold.current = 0;
    if (raf.current) cancelAnimationFrame(raf.current);
    setTyped('');
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, cancel]);

  useEffect(() => { if (!isOpen) { setTyped(''); setPressing(false); setFillPct(0); lastThreshold.current = 0; } }, [isOpen]);

  const startHold = useCallback(() => {
    if (!armed) return;
    setPressing(true);
    startedAt.current = performance.now();
    lastThreshold.current = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt.current;
      const pct = Math.min(1, elapsed / holdDurationMs);
      setFillPct(pct);
      const nextThreshold = Math.floor(pct / 0.25);
      if (nextThreshold > lastThreshold.current) {
        lastThreshold.current = nextThreshold;
        setAnnouncement(nextThreshold >= 4 ? '100% confirming' : `${nextThreshold * 25}% held`);
      }
      if (elapsed >= holdDurationMs) {
        setPressing(false); setFillPct(0); onConfirm(); return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [armed, holdDurationMs, onConfirm]);

  const endHold = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setPressing(false);
    setFillPct(0);
    lastThreshold.current = 0;
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="alertdialog" aria-labelledby={titleId} aria-describedby={descId}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: rm ? 0.08 : 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          onClick={cancel}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: rm ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: rm ? 1 : 0.97 }}
            transition={{ duration: rm ? 0.08 : 0.32, ease: [0.23, 1, 0.32, 1] }}
            className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-6"
          >
            <h2 id={titleId} className="font-display text-lg text-text-primary mb-1">{title}</h2>
            <p id={descId} className="text-sm text-text-secondary">{description}</p>
            {requireTypedConfirmation && (
              <label className="block mt-4 text-xs">
                <span className="block text-text-secondary mb-1">{requireTypedConfirmation.prompt}</span>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                />
              </label>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={cancel} className="px-3 py-1.5 rounded-md text-sm hover:bg-surface-0">Cancel</button>
              <button
                disabled={!armed}
                autoFocus={!requireTypedConfirmation}
                onPointerDown={startHold}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); startHold(); } }}
                onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endHold(); } }}
                aria-label={confirmLabel}
                data-testid="confirm-destructive-btn"
                data-armed={armed}
                data-pressing={pressing}
                className={`relative overflow-hidden px-4 py-2 rounded-md text-sm font-semibold text-white ${armed ? 'bg-gh-red hover:bg-gh-red/90' : 'bg-gh-red/40 cursor-not-allowed'}`}
              >
                <span className="relative z-10">{confirmLabel}</span>
                <span
                  aria-hidden
                  style={{ clipPath: `inset(0 ${100 - fillPct * 100}% 0 0)` }}
                  className="absolute inset-0 bg-black/25"
                />
              </button>
            </div>
            <div className="sr-only" aria-live="polite">{announcement}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
