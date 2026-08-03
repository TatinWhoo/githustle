import type { GHNodeType } from '../../lib/flowchart-utils';
const TYPES: GHNodeType[] = ['milestone', 'process', 'decision', 'data', 'input', 'output', 'delay', 'subprocess', 'terminal', 'note', 'group'];
interface Props { open: boolean; onClose: () => void; onInsert: (t: GHNodeType) => void }
export function FlowchartDrawer({ open, onClose, onInsert }: Props) {
  if (!open) return null;
  return (
    <aside className="absolute top-12 right-2 z-10 w-52 bg-white border border-border rounded-md shadow-elevated p-2">
      <div className="flex items-center justify-between px-1 pb-1 border-b border-border">
        <span className="text-xs font-semibold">Insert</span>
        <button onClick={onClose} aria-label="Close" className="text-text-muted text-xs">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {TYPES.map((t) => <button key={t} onClick={() => { onInsert(t); onClose(); }} className="text-xs text-left px-2 py-1 rounded hover:bg-surface-0 capitalize">{t}</button>)}
      </div>
    </aside>
  );
}
