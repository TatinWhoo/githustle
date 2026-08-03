import type { StickyNote } from '@/types/domain';
export function SharedStickyBoard({ notes }: { notes: StickyNote[] }) {
  return (
    <div className="relative bg-surface-1 border border-border rounded-2xl h-[400px] overflow-hidden">
      {notes.filter((n) => n.isShared).map((n) => (
        <div key={n.id} style={{ position: 'absolute', top: n.y, left: n.x, backgroundColor: n.color }} className="w-40 h-28 p-2 rounded-md shadow-card">
          <div className="text-xs">{n.body}</div>
        </div>
      ))}
    </div>
  );
}
