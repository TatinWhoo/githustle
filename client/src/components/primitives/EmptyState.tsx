import { Link } from 'react-router-dom';
import { Package, MagnifyingGlass, Briefcase, Folder, Graph, BookmarkSimple, Bell } from '@phosphor-icons/react';

export type EmptyIllustration = 'inbox' | 'search' | 'jobs' | 'projects' | 'flowchart' | 'bookmark' | 'notifications';

export interface EmptyStateAction { label: string; onClick?: () => void; to?: string }

export interface EmptyStateProps {
  illustration?: EmptyIllustration;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

const ICONS: Record<EmptyIllustration, React.ComponentType<{ size?: number; className?: string; weight?: 'regular' }>> = {
  inbox: Package, search: MagnifyingGlass, jobs: Briefcase, projects: Folder,
  flowchart: Graph, bookmark: BookmarkSimple, notifications: Bell,
};

function ActionBtn({ a, primary }: { a: EmptyStateAction; primary?: boolean }) {
  const cls = primary
    ? 'bg-gh-teal text-white hover:bg-gh-teal-hover px-4 py-2 rounded-lg text-sm font-semibold'
    : 'text-gh-teal hover:underline text-sm font-medium';
  if (a.to) return <Link to={a.to} className={cls}>{a.label}</Link>;
  return <button onClick={a.onClick} className={cls}>{a.label}</button>;
}

export function EmptyState({ illustration = 'inbox', title, description, primaryAction, secondaryAction }: EmptyStateProps) {
  const Icon = ICONS[illustration];
  return (
    <div role="status" className="flex flex-col items-center justify-center text-center py-12 px-6 gap-3">
      <Icon size={48} className="text-text-muted" aria-hidden weight="regular" />
      <h3 className="font-display text-lg text-text-primary">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-sm">{description}</p>}
      <div className="flex items-center gap-3 mt-2">
        {primaryAction && <ActionBtn a={primaryAction} primary />}
        {secondaryAction && <ActionBtn a={secondaryAction} />}
      </div>
    </div>
  );
}
