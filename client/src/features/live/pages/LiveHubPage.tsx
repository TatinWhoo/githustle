import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/primitives/PageHeader';
import { PageShellSection } from '@/components/primitives/PageShellSection';
import { GHCard } from '@/components/primitives/GHCard';
import { StatusPill } from '@/components/primitives/StatusPill';
import { LoadingSkeleton } from '@/components/primitives/LoadingSkeleton';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useProjects } from '../hooks/useProjects';

export function LiveHubPage() {
  const { data = [], isLoading } = useProjects();
  return (
    <PageShellSection>
      <PageHeader title="Live Workspaces" subtitle="Active projects you're part of." />
      {isLoading && <LoadingSkeleton variant="card" count={6} />}
      {!isLoading && data.length === 0 && <EmptyState illustration="projects" title="No active projects" primaryAction={{ label: 'Go to Hub', to: '/hub' }} />}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((p) => (
          <Link key={p.id} to={`/live/${p.id}`}>
            <GHCard interactive className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-sm">{p.jobTitle}</div>
                <StatusPill status={p.status} />
              </div>
              <div className="text-xs text-text-muted">{p.freelancerName} ↔ {p.clientName}</div>
              <div className="text-[11px] text-text-secondary">Milestones: {p.milestones.filter((m) => m.status === 'approved').length}/{p.milestones.length}</div>
            </GHCard>
          </Link>
        ))}
      </div>
    </PageShellSection>
  );
}
export default LiveHubPage;
