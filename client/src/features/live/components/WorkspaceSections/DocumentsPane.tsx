import { useState } from 'react';
import type { CollabDocument } from '@/types/domain';
import { GHCard } from '@/components/primitives/GHCard';
import { EmptyState } from '@/components/primitives/EmptyState';

export function DocumentsPane({ docs }: { docs: CollabDocument[] }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (docs.length === 0) return <EmptyState illustration="inbox" title="No shared documents yet" />;
  return (
    <div className="flex flex-col gap-3">
      {docs.map((d) => (
        <GHCard key={d.id} className="p-4">
          <div className="font-semibold text-sm mb-2">{d.title}</div>
          <textarea
            defaultValue={d.body}
            onChange={(e) => setDrafts((s) => ({ ...s, [d.id]: e.target.value }))}
            className="w-full min-h-[120px] border border-border rounded-md p-2 text-sm"
          />
          <div className="text-[11px] text-text-muted mt-2">Updated by {d.updatedBy} · {new Date(d.updatedAt).toLocaleString()}</div>
          <div className="sr-only">{drafts[d.id] ?? ''}</div>
        </GHCard>
      ))}
    </div>
  );
}
