import type { CallRecord } from '@/types/domain';
export function CallRecordList({ calls }: { calls: CallRecord[] }) {
  if (calls.length === 0) return <div className="text-sm text-text-muted p-4">No calls yet.</div>;
  return (
    <ul className="divide-y divide-border">
      {calls.map((c) => (
        <li key={c.id} className="py-2 text-sm flex items-center justify-between">
          <span>{new Date(c.startedAt).toLocaleString()}</span>
          <span className="text-text-muted text-xs">{Math.round((c.endedAt - c.startedAt) / 60000)} min · {c.participants.length} participants</span>
        </li>
      ))}
    </ul>
  );
}
