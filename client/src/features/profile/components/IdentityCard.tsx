import { GHCard } from '@/components/primitives/GHCard';
import type { User } from '@/types/user';

export function IdentityCard({ user, onEdit }: { user: User; onEdit: () => void }) {
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <GHCard className="p-6 flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-gh-teal text-white flex items-center justify-center font-bold text-xl">
        {initials}
      </div>
      <div className="flex-1">
        <div className="font-display text-xl">{user.name}</div>
        <div className="text-xs text-text-muted capitalize">{user.role}</div>
      </div>
      <button
        onClick={onEdit}
        autoFocus
        className="text-sm bg-gh-teal text-white rounded-md px-3 py-1.5 font-semibold"
      >
        Edit profile
      </button>
    </GHCard>
  );
}
