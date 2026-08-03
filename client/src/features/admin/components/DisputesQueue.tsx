import type { Dispute } from '@/types/domain';
import { StatusPill } from '@/components/primitives/StatusPill';
import { MoneyPHP } from '@/components/primitives/MoneyPHP';
import { fixtureStore } from '@/lib/fixtures/fixtureLoader';

export interface DisputesQueueProps {
  disputes: Dispute[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DisputesQueue({ disputes, selectedId, onSelect }: DisputesQueueProps) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-0 text-xs uppercase tracking-wider text-text-muted">
          <tr>
            <th className="text-left p-3">Project</th>
            <th className="text-left p-3">Amount</th>
            <th className="text-left p-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {disputes.map((d) => {
            const project = fixtureStore.getProject(d.projectId);
            return (
              <tr
                key={d.id}
                onClick={() => onSelect(d.id)}
                className={`cursor-pointer hover:bg-surface-0 ${selectedId === d.id ? 'bg-surface-0' : ''}`}
              >
                <td className="p-3">
                  <div className="font-semibold">{project?.jobTitle ?? d.projectId}</div>
                  <div className="text-[11px] text-text-muted">
                    {project?.clientName} ↔ {project?.freelancerName}
                  </div>
                </td>
                <td className="p-3">
                  <MoneyPHP amount={d.amount} />
                </td>
                <td className="p-3">
                  <StatusPill status={d.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
