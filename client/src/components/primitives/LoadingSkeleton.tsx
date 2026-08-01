export type SkeletonVariant = 'card' | 'row' | 'grid' | 'board' | 'table' | 'thread' | 'tile' | 'pricing';

interface LoadingSkeletonProps { variant: SkeletonVariant; count?: number; className?: string }

const BASE = 'relative overflow-hidden bg-surface-1 border border-border rounded-2xl';
const SHIMMER =
  'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1400ms_linear_infinite] before:bg-gradient-to-r before:from-transparent before:via-black/[0.04] before:to-transparent';

function Cell({ h = 'h-28', extra = '' }: { h?: string; extra?: string }) {
  return <div className={`${BASE} ${SHIMMER} ${h} ${extra}`} />;
}

export function LoadingSkeleton({ variant, count = 6, className = '' }: LoadingSkeletonProps) {
  const arr = Array.from({ length: count });
  switch (variant) {
    case 'card': return <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${className}`}>{arr.map((_, i) => <Cell key={i} h="h-40" />)}</div>;
    case 'row': return <div className={`flex flex-col gap-2 ${className}`}>{arr.map((_, i) => <Cell key={i} h="h-14" />)}</div>;
    case 'grid': return <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>{arr.map((_, i) => <Cell key={i} h="h-24" />)}</div>;
    case 'board': return <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>{arr.map((_, i) => <Cell key={i} h="h-32" />)}</div>;
    case 'table': return <div className={`flex flex-col gap-1 ${className}`}>{arr.map((_, i) => <Cell key={i} h="h-10" extra="rounded-md" />)}</div>;
    case 'thread': return <div className={`flex flex-col gap-3 ${className}`}>{arr.slice(0, 3).map((_, i) => <Cell key={i} h="h-16" />)}</div>;
    case 'tile': return <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>{arr.slice(0, 4).map((_, i) => <Cell key={i} h="h-24" />)}</div>;
    case 'pricing': return <div className={`grid grid-cols-6 grid-rows-2 gap-4 ${className}`}>
      <Cell h="h-96" extra="col-span-3 row-span-2" />
      <Cell h="h-44" extra="col-span-3" />
      <Cell h="h-44" extra="col-span-3" />
    </div>;
  }
}
