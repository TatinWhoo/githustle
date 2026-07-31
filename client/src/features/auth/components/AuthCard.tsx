import type { ReactNode } from 'react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] grid place-items-center bg-gh-ink px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-elevated p-8">
        <div className="flex items-center gap-1 mb-6">
          <span className="font-sans font-semibold text-lg tracking-tight text-gh-ink">Git</span>
          <span className="w-1.5 h-1.5 rounded-full bg-gh-teal" />
          <span className="font-sans font-light text-lg tracking-tight text-gh-ink">Hustle</span>
        </div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
