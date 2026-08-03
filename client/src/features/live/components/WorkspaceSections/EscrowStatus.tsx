import { GHCard } from '@/components/primitives/GHCard';
import { MoneyPHP } from '@/components/primitives/MoneyPHP';
import type { Project } from '@/types/domain';
export function EscrowStatus({ project }: { project: Project }) {
  const total = project.milestones.reduce((a, m) => a + m.amount, 0);
  const released = project.milestones.filter((m) => m.status === 'approved').reduce((a, m) => a + m.amount, 0);
  const inEscrow = project.milestones.filter((m) => m.status === 'submitted').reduce((a, m) => a + m.amount, 0);
  const disputed = project.status === 'disputed' ? project.milestones.filter((m) => m.status === 'submitted').reduce((a, m) => a + m.amount, 0) : 0;
  const Item = ({ label, amount }: { label: string; amount: number }) => (
    <GHCard className="p-3"><div className="text-xs text-text-muted">{label}</div><MoneyPHP amount={amount} className="text-lg" /></GHCard>
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Item label="Total" amount={total} /><Item label="Released" amount={released} />
      <Item label="In escrow" amount={inEscrow} /><Item label="Disputed" amount={disputed} />
    </div>
  );
}
