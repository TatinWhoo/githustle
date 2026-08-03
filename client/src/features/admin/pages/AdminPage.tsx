import { useState } from 'react';
import { PageHeader } from '@/components/primitives/PageHeader';
import { PageShellSection } from '@/components/primitives/PageShellSection';
import { EmptyState } from '@/components/primitives/EmptyState';
import { AnalyticsTiles } from '../components/AnalyticsTiles';
import { DisputesQueue } from '../components/DisputesQueue';
import { AdminDisputePanel } from '../components/AdminDisputePanel';
import { UsersTable } from '../components/UsersTable';
import { AuditLogStream } from '../components/AuditLogStream';
import { useDisputes, useAdminUsers } from '../hooks/useAdminData';

export function AdminPage() {
  const { data: disputes = [] } = useDisputes();
  const { data: users = [] } = useAdminUsers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = disputes.find((d) => d.id === selectedId) ?? null;
  return (
    <PageShellSection>
      <PageHeader title="Admin Desk" subtitle="Mediation, moderation, and monitoring." />
      <AnalyticsTiles />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-6">
        <div>
          {disputes.length === 0 ? (
            <EmptyState illustration="inbox" title="No open disputes" description="Nothing to mediate right now." />
          ) : (
            <DisputesQueue disputes={disputes} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
        <aside>
          {selected ? (
            <AdminDisputePanel dispute={selected} onDone={() => setSelectedId(null)} />
          ) : (
            <EmptyState illustration="search" title="Pick a dispute" description="Select a row to review evidence and resolve." />
          )}
        </aside>
      </div>
      <h2 className="font-display text-lg mt-8 mb-2">Users</h2>
      <UsersTable users={users} />
      <h2 className="font-display text-lg mt-8 mb-2">Audit log</h2>
      <AuditLogStream />
    </PageShellSection>
  );
}
export default AdminPage;
