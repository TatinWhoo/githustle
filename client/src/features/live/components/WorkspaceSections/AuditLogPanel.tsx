import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AuditLogEntry } from '@/types/domain';

export function AuditLogPanel({ entries }: { entries: AuditLogEntry[] }) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const sorted = [...entries].sort((a, b) => b.ts - a.ts);
  const virt = useVirtualizer({ count: sorted.length, getScrollElement: () => parentRef.current, estimateSize: () => 40, overscan: 8 });
  if (sorted.length === 0) return <div className="text-sm text-text-muted p-4">No audit entries.</div>;
  return (
    <div ref={parentRef} className="h-[320px] overflow-y-auto border border-border rounded-2xl">
      <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
        {virt.getVirtualItems().map((v) => {
          const e = sorted[v.index];
          return (
            <div key={e.id} style={{ position: 'absolute', top: v.start, height: v.size, left: 0, right: 0 }} className="px-3 py-1 text-xs flex justify-between border-b border-border">
              <span><b className="font-semibold">{e.actor}</b> · {e.action}</span>
              <span className="text-text-muted">{new Date(e.ts).toLocaleTimeString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
