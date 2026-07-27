import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  theme = 'light'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const baseStyles = theme === 'dark'
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 hover:border-zinc-700'
    : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300';

  const menuStyles = theme === 'dark'
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
    : 'bg-white border-zinc-200 text-zinc-900';

  const optionStyles = (isActive: boolean) => {
    if (theme === 'dark') {
      return isActive
        ? 'bg-teal-950 text-teal-400 font-semibold'
        : 'hover:bg-zinc-900 text-zinc-300';
    } else {
      return isActive
        ? 'bg-teal-50 text-teal-600 font-semibold'
        : 'hover:bg-slate-50 text-zinc-700';
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`} style={{ minWidth: '140px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium font-sans cursor-pointer transition shadow-sm focus:outline-none ${baseStyles}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown size={14} className={`text-text-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto border rounded-lg shadow-xl ${menuStyles}`}
          >
            <div className="py-1">
              {options.map((option) => {
                const isActive = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs font-sans transition cursor-pointer ${optionStyles(isActive)}`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                      <span className="truncate">{option.label}</span>
                    </span>
                    {isActive && <Check size={12} className={theme === 'dark' ? 'text-teal-400' : 'text-teal-600'} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
