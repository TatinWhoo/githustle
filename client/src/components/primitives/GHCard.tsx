import React from 'react';

export interface GHCardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'elevated' | 'hero';
  as?: React.ElementType;
  interactive?: boolean;
}

export function GHCard({ variant = 'default', as: Tag = 'div', interactive, className = '', children, ...rest }: GHCardProps) {
  const base =
    variant === 'hero'
      ? 'rounded-[2rem] p-1.5 ring-1 ring-black/5 bg-surface-1'
      : variant === 'elevated'
        ? 'bg-surface-1 rounded-2xl shadow-elevated'
        : 'bg-surface-1 border border-border rounded-2xl shadow-card';
  const hover = interactive ? 'hover:shadow-elevated cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-gh-teal' : '';
  const inner = variant === 'hero'
    ? <div className="rounded-[calc(2rem-0.375rem)] bg-surface-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] p-6">{children}</div>
    : children;
  return <Tag className={`${base} ${hover} ${className}`} {...rest}>{inner}</Tag>;
}
