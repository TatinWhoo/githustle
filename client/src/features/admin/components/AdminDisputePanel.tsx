import { useState } from 'react';
import type { Dispute } from '@/types/domain';
import { GHCard } from '@/components/primitives/GHCard';
import { useResolveDispute } from '../hooks/useAdminMutations';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface AdminDisputePanelProps {
  dispute: Dispute;
  onDone: () => void;
}

type ResolutionKind = 'release' | 'revision' | 'refund';

export function AdminDisputePanel({ dispute, onDone }: AdminDisputePanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<ResolutionKind>('release');
  const resolve = useResolveDispute();
  const canSubmit = notes.trim().length > 0 && !resolve.isPending;

  return (
    <GHCard className="p-4">
      <div className="font-semibold text-sm">Resolve dispute</div>
      <div className="mt-2 flex gap-2 text-xs">
        {(['release', 'revision', 'refund'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-1 rounded-full border capitalize ${kind === k ? 'bg-gh-ink text-white border-gh-ink' : 'border-border hover:border-gh-teal'}`}
          >
            {k}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Admin notes (required)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full mt-3 border border-border rounded-md p-2 text-sm min-h-[80px]"
      />
      {!notes.trim() && (
        <div role="alert" className="text-[11px] text-gh-red mt-1">
          Notes required.
        </div>
      )}
      <button
        disabled={!canSubmit}
        onClick={() => {
          if (!user) return;
          resolve.mutate({ id: dispute.id, kind, notes, actorId: user.id });
          onDone();
        }}
        className={`mt-3 px-4 py-2 rounded-md text-sm font-semibold text-white ${canSubmit ? 'bg-gh-teal hover:bg-gh-teal-hover' : 'bg-gh-teal/40 cursor-not-allowed'}`}
      >
        Submit resolution
      </button>
    </GHCard>
  );
}
