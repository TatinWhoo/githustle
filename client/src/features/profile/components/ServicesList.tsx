import type { FreelancerService } from '@/types/domain';
import { GHCard } from '@/components/primitives/GHCard';
import { MoneyPHP } from '@/components/primitives/MoneyPHP';
import { EmptyState } from '@/components/primitives/EmptyState';

export function ServicesList({ services }: { services: FreelancerService[] }) {
  if (services.length === 0) {
    return (
      <EmptyState
        illustration="jobs"
        title="No services offered yet"
        description="Add a service to start receiving hires."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {services.map((s) => (
        <GHCard key={s.id} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-sm">{s.title}</div>
            <MoneyPHP amount={s.rate} />
          </div>
          <p className="text-xs text-text-secondary mt-1">{s.description}</p>
          <div className="text-[11px] text-text-muted mt-1">
            {s.deliveryDays}d delivery · {s.completedJobs} jobs
          </div>
        </GHCard>
      ))}
    </div>
  );
}
