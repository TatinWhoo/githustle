import { useRef, useState, cloneElement, isValidElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface GHTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function GHTooltip({ content, children, side = 'top' }: GHTooltipProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement | null>(null);
  const origin = { top: 'bottom center', bottom: 'top center', left: 'right center', right: 'left center' }[side];
  const offset = { top: '-translate-y-full -mt-1', bottom: 'mt-1 top-full', left: 'right-full -translate-x-1', right: 'left-full translate-x-1' }[side];

  const trigger = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ onMouseEnter?: () => void; onMouseLeave?: () => void; onFocus?: () => void; onBlur?: () => void }>, {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
        onFocus: () => setOpen(true),
        onBlur: () => setOpen(false),
      })
    : children;

  return (
    <span ref={anchor} className="relative inline-flex">
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: origin }}
            className={`absolute z-50 whitespace-nowrap rounded-md bg-gh-ink px-2 py-1 text-[11px] font-medium text-white shadow-elevated ${offset}`}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
