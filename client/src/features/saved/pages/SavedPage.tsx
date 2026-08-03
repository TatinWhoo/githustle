import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/primitives/PageHeader';
import { PageShellSection } from '@/components/primitives/PageShellSection';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useSavedJobs } from '@/stores/savedJobs.store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fixtureStore } from '@/lib/fixtures/fixtureLoader';
import { SavedJobRow } from '../components/SavedJobRow';

export function SavedPage() {
  const { user } = useAuth();
  const hydrate = useSavedJobs((s) => s.hydrate);
  const ids = useSavedJobs((s) => s.ids);
  const unsave = useSavedJobs((s) => s.unsave);
  const save = useSavedJobs((s) => s.save);
  const { push, dismiss } = useToast();

  useEffect(() => {
    if (user) hydrate(user.id);
  }, [user, hydrate]);

  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 200);

  const jobs = useMemo(() => {
    const all = fixtureStore.getJobs().filter((j) => ids.has(j.id));
    return q ? all.filter((j) => j.title.toLowerCase().includes(q.toLowerCase())) : all;
  }, [ids, q]);

  const handleUnsave = (jobId: string) => {
    const job = fixtureStore.getJob(jobId);
    unsave(jobId);
    const toastId = push({
      intent: 'info',
      message: `Unsaved "${job?.title ?? 'job'}"`,
      action: {
        label: 'Undo',
        onClick: () => {
          save(jobId);
          dismiss(toastId);
        },
      },
    });
  };

  if (ids.size === 0) {
    return (
      <EmptyState
        illustration="bookmark"
        title="No saved jobs yet"
        primaryAction={{ label: 'Go to Hub', to: '/hub' }}
      />
    );
  }

  return (
    <PageShellSection>
      <PageHeader title="Saved Posts" subtitle="Your bookmarked jobs." />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search saved jobs…"
        className="max-w-md w-full border border-border rounded-md px-3 py-2 text-sm mb-4"
      />
      <ul className="flex flex-col gap-2 max-w-4xl mx-auto">
        {jobs.map((j) => (
          <SavedJobRow key={j.id} job={j} onUnsave={handleUnsave} />
        ))}
      </ul>
    </PageShellSection>
  );
}

export default SavedPage;
