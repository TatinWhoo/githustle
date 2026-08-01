import { useLocation } from 'react-router-dom';
import { LoadingSkeleton } from '@/components/primitives/LoadingSkeleton';

export function RouteFallback() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/hub')) return <div className="max-w-7xl mx-auto p-6"><LoadingSkeleton variant="card" count={6} /></div>;
  if (pathname.startsWith('/conversations')) return <div className="grid grid-cols-[280px_1fr] gap-0"><LoadingSkeleton variant="row" count={5} /><LoadingSkeleton variant="thread" /></div>;
  if (pathname.startsWith('/personal')) return <div className="max-w-7xl mx-auto p-6"><LoadingSkeleton variant="board" count={4} /></div>;
  if (pathname.startsWith('/live')) return <div className="max-w-7xl mx-auto p-6"><LoadingSkeleton variant="card" count={6} /></div>;
  if (pathname.startsWith('/saved')) return <div className="max-w-4xl mx-auto p-6"><LoadingSkeleton variant="row" count={5} /></div>;
  if (pathname.startsWith('/admin')) return <div className="max-w-7xl mx-auto p-6"><LoadingSkeleton variant="tile" /><LoadingSkeleton variant="table" count={5} className="mt-4" /></div>;
  if (pathname.startsWith('/profile')) return <div className="max-w-7xl mx-auto p-6"><LoadingSkeleton variant="card" count={3} /></div>;
  if (pathname.startsWith('/premium')) return <div className="max-w-6xl mx-auto p-6"><LoadingSkeleton variant="pricing" /></div>;
  if (pathname.startsWith('/help')) return <div className="max-w-7xl mx-auto p-6"><LoadingSkeleton variant="row" count={4} /></div>;
  if (pathname.startsWith('/settings')) return <div className="max-w-7xl mx-auto p-6"><LoadingSkeleton variant="row" count={5} /></div>;
  return <div className="max-w-7xl mx-auto p-6"><LoadingSkeleton variant="card" count={3} /></div>;
}
