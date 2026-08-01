export type PillStatus =
  | 'pending' | 'submitted' | 'approved' | 'rejected' | 'revision_requested'
  | 'active' | 'completed' | 'disputed'
  | 'paid' | 'overdue'
  | 'open' | 'resolved' | 'escalated'
  | 'warned' | 'suspended';

interface Mapping { bg: string; text: string; label: string }

export const STATUS_MAP: Record<PillStatus, Mapping> = {
  pending:             { bg: 'bg-gh-amber-light', text: 'text-gh-amber', label: 'Pending' },
  submitted:           { bg: 'bg-gh-blue-light',  text: 'text-gh-blue',  label: 'Submitted' },
  approved:            { bg: 'bg-gh-green-light', text: 'text-gh-green', label: 'Approved' },
  rejected:            { bg: 'bg-gh-red-light',   text: 'text-gh-red',   label: 'Rejected' },
  revision_requested:  { bg: 'bg-gh-amber-light', text: 'text-gh-amber', label: 'Revision' },
  active:              { bg: 'bg-gh-teal-light',  text: 'text-gh-teal',  label: 'Active' },
  completed:           { bg: 'bg-gh-green-light', text: 'text-gh-green', label: 'Completed' },
  disputed:            { bg: 'bg-[#F3E8FF]',      text: 'text-status-disputed', label: 'Disputed' },
  paid:                { bg: 'bg-gh-green-light', text: 'text-gh-green', label: 'Paid' },
  overdue:             { bg: 'bg-gh-red-light',   text: 'text-status-overdue', label: 'Overdue' },
  open:                { bg: 'bg-gh-red-light',   text: 'text-gh-red',   label: 'Open' },
  resolved:            { bg: 'bg-gh-green-light', text: 'text-gh-green', label: 'Resolved' },
  escalated:           { bg: 'bg-[#F3E8FF]',      text: 'text-status-disputed', label: 'Escalated' },
  warned:              { bg: 'bg-gh-amber-light', text: 'text-gh-amber', label: 'Warned' },
  suspended:           { bg: 'bg-gh-red-light',   text: 'text-gh-red',   label: 'Suspended' },
};

export const ALL_STATUSES = Object.keys(STATUS_MAP) as PillStatus[];

interface StatusPillProps { status: PillStatus; size?: 'sm' | 'md' }
export function StatusPill({ status, size = 'sm' }: StatusPillProps) {
  const m = STATUS_MAP[status];
  const pad = size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  const italic = status === 'revision_requested' ? 'italic' : '';
  return (
    <span data-testid={`status-${status}`} className={`inline-flex items-center gap-1.5 rounded-full font-medium ${m.bg} ${m.text} ${pad} ${italic} transition-colors duration-[160ms] ease-in-out`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.text.replace('text-', 'bg-')}`} aria-hidden />
      {m.label}
    </span>
  );
}
