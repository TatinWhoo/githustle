import { GHCard } from '@/components/primitives/GHCard';
import { MoneyPHP } from '@/components/primitives/MoneyPHP';

interface Props {
  tier: string;
  tagline: string;
  price: number;
  features: string[];
  recommended?: boolean;
  onUpgrade: () => void;
}

export function HeroCard({ tier, tagline, price, features, recommended, onUpgrade }: Props) {
  const variant = recommended ? 'hero' : 'default';
  return (
    <GHCard variant={variant} className={recommended ? 'col-span-6 md:col-span-3 row-span-2' : 'col-span-6 md:col-span-3'}>
      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-sage)' }}>{tier}</div>
      <div className="font-serif text-3xl mt-1 text-gh-ink">{tagline}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <MoneyPHP amount={price} className="text-xl" />
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/mo</span>
      </div>
      <ul className="mt-4 space-y-1 text-sm list-disc pl-5" style={{ color: 'var(--color-text-secondary)' }}>
        {features.map((f) => <li key={f}>{f}</li>)}
      </ul>
      <button
        autoFocus={recommended}
        onClick={onUpgrade}
        className="mt-5 bg-gh-teal text-white rounded-md px-4 py-2 text-sm font-semibold hover:bg-gh-teal-hover transition-colors"
      >
        Upgrade
      </button>
    </GHCard>
  );
}
