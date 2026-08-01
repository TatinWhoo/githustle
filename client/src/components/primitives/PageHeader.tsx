import { Link } from 'react-router-dom';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="text-xs text-text-muted mb-1">
            <ol className="flex items-center gap-1">
              {breadcrumbs.map((b, i) => (
                <li key={`${b.label}-${i}`} className="flex items-center gap-1">
                  {b.to ? <Link to={b.to} className="hover:text-text-secondary">{b.label}</Link> : <span>{b.label}</span>}
                  {i < breadcrumbs.length - 1 && <span aria-hidden>/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="font-display text-2xl md:text-3xl leading-tight tracking-tight text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
