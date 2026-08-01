import React from 'react';

export interface GHTagProps { children: React.ReactNode; tone?: 'neutral' | 'teal' | 'amber'; className?: string }
const TONE = {
  neutral: 'bg-surface-0 text-text-secondary border-border',
  teal: 'bg-gh-teal-light text-gh-teal border-gh-teal/20',
  amber: 'bg-gh-amber-light text-gh-amber border-gh-amber/20',
} as const;
export function GHTag({ children, tone = 'neutral', className = '' }: GHTagProps) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[tone]} ${className}`}>{children}</span>;
}
