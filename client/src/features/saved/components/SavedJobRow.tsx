import { Link } from 'react-router-dom';
import type { Job } from '@/types/domain';
import { MoneyPHP } from '@/components/primitives/MoneyPHP';
import { GHTag } from '@/components/primitives/GHTag';

export function SavedJobRow({ job, onUnsave }: { job: Job; onUnsave: (id: string) => void }) {
  return (
    <li className="flex items-center gap-3 border border-border rounded-2xl p-3 bg-surface-1">
      <Link to={`/hub?jobId=${job.id}`} className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{job.title}</div>
        <div className="text-[11px] text-text-muted truncate">
          {job.field} · <MoneyPHP amount={job.budget} />
        </div>
        <div className="mt-1 flex gap-1 flex-wrap">
          {job.skills.slice(0, 3).map((s) => (
            <GHTag key={s}>{s}</GHTag>
          ))}
        </div>
      </Link>
      <button
        onClick={() => onUnsave(job.id)}
        className="text-xs text-gh-red font-semibold shrink-0"
      >
        Unsave
      </button>
    </li>
  );
}
