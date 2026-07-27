import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, AlertCircle } from 'lucide-react';

interface CustomPromptModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  error?: string;
}

export default function CustomPromptModal({
  isOpen,
  title,
  description,
  placeholder = 'Type here...',
  defaultValue = '',
  onConfirm,
  onCancel,
  error
}: CustomPromptModalProps) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(inputValue.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative bg-white border border-border rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-4 font-sans select-none"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 text-gh-teal border border-border/60 rounded-lg shrink-0">
                <HelpCircle size={18} />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-sans font-bold text-xs text-text-primary uppercase tracking-wide">
                  {title}
                </h4>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <input
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-50/50 border border-border rounded-lg text-xs font-medium focus:outline-none focus:border-gh-teal focus:bg-white transition"
                />
                {error && (
                  <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-gh-red">
                    <AlertCircle size={10} />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-1.5 border border-border hover:bg-slate-50 text-text-secondary rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white rounded-lg shadow-sm transition cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
