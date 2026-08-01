import type { Notification as NotificationType } from '@/types/domain';
import { ChatCircle, CheckCircle, Warning, Receipt, Envelope, XCircle } from '@phosphor-icons/react';

const TYPE_ICON = {
  proposal_received: ChatCircle,
  proposal_accepted: CheckCircle,
  proposal_rejected: XCircle,
  milestone_submitted: ChatCircle,
  milestone_approved: CheckCircle,
  message_received: Envelope,
  invoice_paid: Receipt,
  invoice_overdue: Warning,
  dispute_opened: Warning,
} as const;

export function Notification({ n, onActivate }: { n: NotificationType; onActivate: (n: NotificationType) => void }) {
  const Icon = TYPE_ICON[n.type];
  return (
    <button
      onClick={() => onActivate(n)}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-md hover:bg-surface-0 ${n.is_read ? 'opacity-70' : ''}`}
    >
      <Icon size={18} weight={n.is_read ? 'fill' : 'regular'} className="text-gh-teal shrink-0 mt-0.5" />
      <span className="flex-1 min-w-0">
        <span className={`block text-sm ${n.is_read ? 'font-normal' : 'font-semibold'} text-text-primary truncate`}>{n.title}</span>
        <span className="block text-xs text-text-muted truncate">{n.body}</span>
      </span>
    </button>
  );
}
