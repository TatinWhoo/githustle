import { useState } from 'react';

export interface FaqItem {
  id: string;
  title: string;
  body: string;
  category: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col divide-y divide-border border border-border rounded-2xl overflow-hidden">
      {items.map((i) => (
        <div key={i.id}>
          <button
            onClick={() => setOpen((s) => ({ ...s, [i.id]: !s[i.id] }))}
            aria-expanded={!!open[i.id]}
            className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-surface-0 transition-colors"
          >
            <span className="text-sm font-semibold text-text-primary">{i.title}</span>
            <span aria-hidden className="text-text-muted text-base leading-none select-none">
              {open[i.id] ? '−' : '+'}
            </span>
          </button>
          {open[i.id] && (
            <div className="px-4 py-3 text-sm text-text-secondary">
              {i.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
