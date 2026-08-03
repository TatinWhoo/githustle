import { useState } from 'react';
import type { Project, Milestone } from '@/types/domain';
import { StatusPill } from '@/components/primitives/StatusPill';
import { MoneyPHP } from '@/components/primitives/MoneyPHP';
import { GHCard } from '@/components/primitives/GHCard';
import { ConfirmDestructive } from '@/components/primitives/ConfirmDestructive';
import { useMilestoneActions } from '../../hooks/useMilestoneActions';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface Props { project: Project }
export function MilestonesLedger({ project }: Props) {
  const { user, role } = useAuth();
  const [disputeFor, setDisputeFor] = useState<Milestone | null>(null);
  const acts = useMilestoneActions();
  const isClient = role === 'client';
  const isFreelancer = role === 'freelancer';

  return (
    <div className="flex flex-col gap-3">
      {project.milestones.map((m) => (
        <GHCard key={m.id} className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">{m.title}</div>
              <div className="text-xs text-text-muted">Due {new Date(m.dueDate).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <MoneyPHP amount={m.amount} />
              <StatusPill status={m.status} />
            </div>
          </div>
          <p className="text-sm text-text-secondary">{m.description}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {isFreelancer && m.status === 'pending' && (
              <button onClick={() => acts.submit.mutate({ projectId: project.id, milestoneId: m.id, actorId: user!.id, file: 'delivery.zip', note: 'ready' })} className="text-xs bg-gh-teal text-white px-3 py-1 rounded-md font-semibold">Submit Deliverable</button>
            )}
            {isClient && m.status === 'submitted' && (
              <>
                <button onClick={() => acts.approve.mutate({ projectId: project.id, milestoneId: m.id, actorId: user!.id })} className="text-xs bg-gh-green text-white px-3 py-1 rounded-md font-semibold">Approve</button>
                <button onClick={() => acts.revision.mutate({ projectId: project.id, milestoneId: m.id, actorId: user!.id })} className="text-xs border border-border px-3 py-1 rounded-md font-semibold">Request Revision</button>
                <button onClick={() => setDisputeFor(m)} className="text-xs border border-gh-red text-gh-red px-3 py-1 rounded-md font-semibold">Open Dispute</button>
              </>
            )}
          </div>
        </GHCard>
      ))}
      <ConfirmDestructive
        isOpen={!!disputeFor}
        title="Open dispute"
        description={`This will freeze the milestone and escalate to admin.`}
        confirmLabel="Open dispute"
        onCancel={() => setDisputeFor(null)}
        onConfirm={() => { if (disputeFor) { acts.dispute.mutate({ projectId: project.id, milestoneId: disputeFor.id, actorId: user!.id, amount: disputeFor.amount }); setDisputeFor(null); } }}
      />
    </div>
  );
}
