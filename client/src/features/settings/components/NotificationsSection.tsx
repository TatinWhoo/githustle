import { useState } from 'react';

const TYPES = [
  'proposal_received',
  'proposal_accepted',
  'proposal_rejected',
  'milestone_submitted',
  'milestone_approved',
  'message_received',
  'invoice_paid',
  'invoice_overdue',
  'dispute_opened',
] as const;

type NotificationType = (typeof TYPES)[number];

export function NotificationsSection() {
  const [state, setState] = useState<Record<NotificationType, boolean>>(
    Object.fromEntries(TYPES.map((t) => [t, true])) as Record<NotificationType, boolean>,
  );

  return (
    <section id="notifications">
      <h2 className="font-display text-lg mb-3">Notifications</h2>
      <div className="flex flex-col gap-1">
        {TYPES.map((t) => (
          <label
            key={t}
            className="flex items-center justify-between text-sm border-b border-border py-2"
          >
            <span className="capitalize">{t.replace(/_/g, ' ')}</span>
            <input
              type="checkbox"
              checked={state[t]}
              onChange={(e) => setState((s) => ({ ...s, [t]: e.target.checked }))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
