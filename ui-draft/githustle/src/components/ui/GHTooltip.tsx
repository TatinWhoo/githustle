import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface GHTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  shortcut?: string;
}

export function GHTooltip({
  children,
  content,
  side = 'bottom',
  delayDuration = 150,
  shortcut,
}: GHTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const sideClasses = {
    top: 'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-1.5 left-1/2 -translate-x-1/2',
    left: 'right-full mr-1.5 top-1/2 -translate-y-1/2',
    right: 'left-full ml-1.5 top-1/2 -translate-y-1/2',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`absolute z-[9999] pointer-events-none whitespace-nowrap bg-slate-900 text-white text-[10px] font-sans font-medium px-2.5 py-1 rounded-lg shadow-xl border border-slate-700/60 ${sideClasses[side]}`}
          >
            <div className="flex items-center gap-2">
              <span>{content}</span>
              {shortcut && (
                <kbd className="text-[8px] font-mono bg-white/15 border border-white/20 px-1 py-0.5 rounded text-white/80 leading-none">
                  {shortcut}
                </kbd>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GHTooltip;
