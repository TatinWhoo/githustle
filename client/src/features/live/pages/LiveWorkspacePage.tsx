import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/primitives/PageHeader';
import { PageShellSection } from '@/components/primitives/PageShellSection';
import { LoadingSkeleton } from '@/components/primitives/LoadingSkeleton';
import { EmptyState } from '@/components/primitives/EmptyState';
import { StatusPill } from '@/components/primitives/StatusPill';
import { useProject } from '../hooks/useProject';
import { MilestonesLedger } from '../components/WorkspaceSections/MilestonesLedger';
import { EscrowStatus } from '../components/WorkspaceSections/EscrowStatus';
import { DocumentsPane } from '../components/WorkspaceSections/DocumentsPane';
import { Whiteboard } from '../components/WorkspaceSections/Whiteboard';
import { SharedStickyBoard } from '../components/WorkspaceSections/SharedStickyBoard';
import { SharedTable } from '../components/WorkspaceSections/SharedTable';
import { FlowchartCanvas } from '../components/WorkspaceSections/FlowchartCanvas';
import { CallRecordList } from '../components/WorkspaceSections/CallRecordList';
import { AuditLogPanel } from '../components/WorkspaceSections/AuditLogPanel';
import { useAuth } from '@/features/auth/hooks/useAuth';

const SECTIONS = ['Milestones', 'Escrow', 'Documents', 'Whiteboard', 'Sticky Notes', 'Shared Tables', 'Flowcharts', 'Calls', 'Audit Log'] as const;
type Section = typeof SECTIONS[number];

export function LiveWorkspacePage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { data, isLoading } = useProject(projectId);
  const [tab, setTab] = useState<Section>('Milestones');

  if (isLoading) return <LoadingSkeleton variant="card" count={6} className="max-w-7xl mx-auto p-6" />;
  if (!data) return <EmptyState illustration="projects" title="Project not found" primaryAction={{ label: 'Back to Live', to: '/live' }} />;
  if (data.clientId !== user?.id && data.freelancerId !== user?.id) return <EmptyState illustration="projects" title="You're not a participant" primaryAction={{ label: 'Back to Live', to: '/live' }} />;

  return (
    <PageShellSection>
      <PageHeader
        title={data.jobTitle}
        breadcrumbs={[{ label: 'Live', to: '/live' }, { label: data.jobTitle }]}
        actions={<StatusPill status={data.status} />}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-0">
        <nav aria-label="Workspace sections" className="border-r border-border pr-2">
          <ul className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <li key={s}>
                <button onClick={() => setTab(s)} className={`w-full text-left px-3 py-2 rounded-md text-sm ${tab === s ? 'bg-surface-0 font-semibold' : 'hover:bg-surface-0'}`}>{s}</button>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-xs text-text-muted"><Link to="/conversations" className="hover:underline">Open conversation →</Link></div>
        </nav>
        <section className="pl-4 flex flex-col gap-4">
          {tab === 'Milestones' && <MilestonesLedger project={data} />}
          {tab === 'Escrow' && <EscrowStatus project={data} />}
          {tab === 'Documents' && <DocumentsPane docs={data.docs} />}
          {tab === 'Whiteboard' && <Whiteboard elements={data.board} />}
          {tab === 'Sticky Notes' && <SharedStickyBoard notes={data.stickyNotes} />}
          {tab === 'Shared Tables' && data.sharedTables.map((t) => <SharedTable key={t.id} table={t} />)}
          {tab === 'Flowcharts' && <FlowchartCanvas initialNodes={data.sharedFlowcharts.nodes} initialEdges={data.sharedFlowcharts.edges} />}
          {tab === 'Calls' && <CallRecordList calls={data.calls} />}
          {tab === 'Audit Log' && <AuditLogPanel entries={data.auditLog} />}
        </section>
      </div>
    </PageShellSection>
  );
}
export default LiveWorkspacePage;
