import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAuditLogs } from '../hooks/useAdminData';

type Level = 'info' | 'warn' | 'error' | '';

export function AuditLogStream() {
  const [level, setLevel] = useState<Level>('');
  const [q, setQ] = useState('');
  const { data = [] } = useAuditLogs({ level: level || undefined, search: q || undefined });
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter((e) => {
      if (level && e.level !== level) return false;
      if (!needle) return true;
      return (
        e.actor.toLowerCase().includes(needle) ||
        e.action.toLowerCase().includes(needle) ||
        e.details.toLowerCase().includes(needle)
      );
    });
  }, [data, level, q]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const virt = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 8,
  });

  return (
    <div>
      <div className="flex gap-2 mb-2 text-xs">
        {(['', 'info', 'warn', 'error'] as const).map((l) => (
          <button
            key={l || 'all'}
            onClick={() => setLevel(l)}
            className={`px-2 py-1 rounded-full border ${level === l ? 'bg-gh-ink text-white border-gh-ink' : 'border-border'}`}
          >
            {l || 'all'}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="ml-auto border border-border rounded-md px-2 py-1"
        />
      </div>
      <div ref={parentRef} className="h-[320px] overflow-y-auto border border-border rounded-2xl">
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map((v) => {
            const e = filtered[v.index];
            return (
              <div
                key={e.id}
                style={{ position: 'absolute', top: v.start, height: v.size, left: 0, right: 0 }}
                className="px-3 py-1 text-xs flex justify-between border-b border-border"
              >
                <span>
                  <b>{e.level.toUpperCase()}</b> · {e.actor} · {e.action}
                </span>
                <span className="text-text-muted">{new Date(e.ts).toLocaleTimeString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
