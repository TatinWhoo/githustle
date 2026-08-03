import type { Review } from '@/types/domain';
import { GHCard } from '@/components/primitives/GHCard';

export function ReviewsPanel({ reviews }: { reviews: Review[] }) {
  const groups = {
    client: reviews.filter((r) => r.reviewerRole === 'client'),
    freelancer: reviews.filter((r) => r.reviewerRole === 'freelancer'),
  };

  return (
    <div className="flex flex-col gap-4">
      {(['client', 'freelancer'] as const).map((k) => (
        <div key={k}>
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            From {k}s
          </div>
          <div className="flex flex-col gap-2">
            {groups[k].map((r) => (
              <GHCard key={r.id} className="p-3 text-sm">
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span>
                    ★ {r.ratings.quality} · comm {r.ratings.communication} · timing{' '}
                    {r.ratings.timeliness}
                  </span>
                </div>
                <div className="mt-1">{r.comment}</div>
              </GHCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
