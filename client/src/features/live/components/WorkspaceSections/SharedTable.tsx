import type { SharedTable as ST } from '@/types/domain';
import { MoneyPHP } from '@/components/primitives/MoneyPHP';
import { StatusPill } from '@/components/primitives/StatusPill';

function renderCell(type: string, val: string | number | null) {
  if (val == null || val === '') return <span className="text-text-muted">—</span>;
  if (type === 'currency') return <MoneyPHP amount={Number(val)} />;
  if (type === 'status') return <StatusPill status={String(val) as never} />;
  if (type === 'url') return <a href={String(val)} className="text-gh-teal underline" target="_blank" rel="noreferrer">{String(val)}</a>;
  if (type === 'date') return <span>{new Date(String(val)).toLocaleDateString()}</span>;
  if (type === 'number') return <span className="font-mono tabular-nums">{val}</span>;
  return <span>{String(val)}</span>;
}

export function SharedTable({ table }: { table: ST }) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border font-semibold text-sm">{table.title}</div>
      <table className="w-full text-sm">
        <thead className="bg-surface-0 text-xs uppercase tracking-wider text-text-muted">
          <tr>{table.columns.map((c) => <th key={c.id} className="text-left px-3 py-2" style={{ width: c.width }}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              {table.columns.map((c) => <td key={c.id} className="px-3 py-2 align-top">{renderCell(c.type, r.cells[c.id])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
