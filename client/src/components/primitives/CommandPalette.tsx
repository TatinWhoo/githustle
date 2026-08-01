import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useHotkey } from '@/hooks/useHotkey';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUiStore } from '@/stores/ui.store';
import type { Job, Project, Dispute, Notification } from '@/types/domain';

interface PaletteState {
  isOpen: boolean; query: string;
  open: () => void; close: () => void; setQuery: (q: string) => void;
}
export const usePaletteState = create<PaletteState>((set) => ({
  isOpen: false, query: '',
  open: () => set({ isOpen: true }), close: () => set({ isOpen: false, query: '' }),
  setQuery: (query) => set({ query }),
}));
export const useCommandPalette = () => usePaletteState(useShallow((s) => ({ isOpen: s.isOpen, open: s.open, close: s.close, query: s.query, setQuery: s.setQuery })));

const NAV_REGISTRY = [
  { label: 'Hub', to: '/hub' }, { label: 'Conversations', to: '/conversations' },
  { label: 'Personal', to: '/personal' }, { label: 'Live', to: '/live' },
  { label: 'Saved', to: '/saved' }, { label: 'Profile', to: '/profile' },
  { label: 'Premium', to: '/premium' }, { label: 'Help', to: '/help' },
  { label: 'Settings', to: '/settings' },
];
const ADMIN_NAV = [{ label: 'Admin', to: '/admin' }];

export function CommandPalette() {
  const { isOpen, open, close, query, setQuery } = useCommandPalette();
  const { role } = useAuth();
  const sim = useUiStore((s) => s.roleSimulator);
  const effectiveRole = sim.isSimulating && sim.simulatedRole ? sim.simulatedRole : role;
  const isAdmin = effectiveRole === 'admin';

  useHotkey('mod+k', (e) => { e.preventDefault(); open(); });
  useHotkey('escape', () => { if (isOpen) close(); }, isOpen);

  const qc = useQueryClient();
  const jobs = (qc.getQueryData(queryKeys.jobs.list()) as Job[] | undefined) ?? [];
  const projects = (qc.getQueryData(queryKeys.projects.list()) as Project[] | undefined) ?? [];
  const disputes = (qc.getQueryData(queryKeys.disputes.list()) as Dispute[] | undefined) ?? [];
  const notifications = (qc.getQueryData(queryKeys.notifications.list()) as Notification[] | undefined) ?? [];

  const nav = useNavigate();

  const navFuse = useMemo(() => new Fuse(isAdmin ? [...NAV_REGISTRY, ...ADMIN_NAV] : NAV_REGISTRY, { keys: ['label', 'to'], threshold: 0.35, includeScore: true }), [isAdmin]);
  const jobsFuse = useMemo(() => new Fuse(jobs, { keys: ['title', 'client.name'], threshold: 0.35 }), [jobs]);
  const projectsFuse = useMemo(() => new Fuse(projects, { keys: ['jobTitle', 'clientName', 'freelancerName'], threshold: 0.35 }), [projects]);
  const disputesFuse = useMemo(() => new Fuse(disputes, { keys: ['id', 'projectId'], threshold: 0.35 }), [disputes]);
  const notifFuse = useMemo(() => new Fuse(notifications, { keys: ['title', 'body'], threshold: 0.35 }), [notifications]);

  const [announce, setAnnounce] = useState('');
  useEffect(() => { if (isOpen) setAnnounce(''); }, [isOpen]);

  if (!isOpen) return null;

  const navResults = query ? navFuse.search(query).slice(0, 5).map((r) => r.item) : (isAdmin ? [...NAV_REGISTRY, ...ADMIN_NAV] : NAV_REGISTRY).slice(0, 5);
  const jobResults = query ? jobsFuse.search(query).slice(0, 5).map((r) => r.item) : [];
  const projectResults = query ? projectsFuse.search(query).slice(0, 5).map((r) => r.item) : [];
  const adminResults = isAdmin && query ? [...disputesFuse.search(query).slice(0, 3).map((r) => r.item), ...notifFuse.search(query).slice(0, 2).map((r) => r.item)] : [];

  const totalResults = navResults.length + jobResults.length + projectResults.length + adminResults.length;

  return (
    <div role="dialog" aria-label="Command palette" data-testid="command-palette" className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/30" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-white rounded-2xl shadow-elevated overflow-hidden">
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setAnnounce(`${totalResults} results`); }}
          placeholder="Search…"
          className="w-full px-4 py-3 border-b border-border text-sm outline-none"
        />
        <div className="max-h-96 overflow-y-auto p-2 text-sm">
          {navResults.length > 0 && <Group title="Navigation">{navResults.map((r) => <Row key={`nav-${r.to}`} label={r.label} onClick={() => { nav(r.to); close(); }} />)}</Group>}
          {jobResults.length > 0 && <Group title="Jobs">{jobResults.map((j) => <Row key={`job-${j.id}`} label={j.title} onClick={() => { nav(`/hub?jobId=${j.id}`); close(); }} />)}</Group>}
          {projectResults.length > 0 && <Group title="Projects">{projectResults.map((p) => <Row key={`prj-${p.id}`} label={p.jobTitle} onClick={() => { nav(`/live/${p.id}`); close(); }} />)}</Group>}
          {adminResults.length > 0 && isAdmin && <Group data-testid="palette-group-admin" title="Admin">{adminResults.map((r) => <Row key={`adm-${(r as { id: string }).id}`} label={`Dispute ${(r as { id: string }).id}`} onClick={() => { nav('/admin'); close(); }} />)}</Group>}
          {query && totalResults === 0 && <div className="p-6 text-center text-xs text-text-muted">No matches for &ldquo;{query}&rdquo;</div>}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic>{announce}</div>
      </div>
    </div>
  );
}

function Group({ title, children, ...rest }: { title: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="mb-2" {...rest}>
      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-text-muted">{title}</div>
      {children}
    </div>
  );
}
function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full text-left px-3 py-1.5 rounded-md hover:bg-surface-0">{label}</button>;
}
