import { HeroCard } from './HeroCard';
import { useToast } from '@/hooks/useToast';

export function PricingBentoGrid() {
  const { push } = useToast();
  const upgrade = () => push({ intent: 'info', message: 'Upgrade flow — coming soon' });

  return (
    <div className="grid grid-cols-6 grid-rows-2 gap-4">
      <HeroCard
        tier="Free"
        tagline="Get started"
        price={0}
        features={['Basic hub', 'Public profile', '5 proposals/month']}
        onUpgrade={upgrade}
      />
      <HeroCard
        tier="Pro"
        tagline="For serious operators"
        price={999}
        features={['Priority in search', 'Unlimited proposals', 'Escrow analytics', 'Advanced filters']}
        recommended
        onUpgrade={upgrade}
      />
      <HeroCard
        tier="Team"
        tagline="For agencies"
        price={4999}
        features={['Team seats (5)', 'Custom fields', 'Admin export', 'Priority support']}
        onUpgrade={upgrade}
      />
    </div>
  );
}
