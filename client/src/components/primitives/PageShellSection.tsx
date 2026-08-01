import React from 'react';

export interface PageShellSectionProps {
  children: React.ReactNode;
  padY?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PAD_Y = { sm: 'py-6', md: 'py-8', lg: 'py-10' } as const;

export function PageShellSection({ children, padY = 'md', className = '' }: PageShellSectionProps) {
  return <div className={`max-w-7xl mx-auto w-full ${PAD_Y[padY]} ${className}`}>{children}</div>;
}
