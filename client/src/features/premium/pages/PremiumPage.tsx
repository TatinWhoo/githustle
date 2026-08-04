import { PricingBentoGrid } from '../components/PricingBentoGrid';
import { FeatureMatrix } from '../components/FeatureMatrix';

export function PremiumPage() {
  return (
    <div
      data-theme="editorial"
      className="-mx-4 md:-mx-8 -my-6 md:-my-8 min-h-full"
      style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-gh-ink)' }}
    >
      <div className="max-w-6xl mx-auto py-16 md:py-24 px-6">
        <header>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight" style={{ color: 'var(--color-gh-ink)' }}>
            GitHustle Premium
          </h1>
          <p className="mt-2 text-lg font-serif italic" style={{ color: 'var(--color-sage)' }}>
            Editorial-grade tools for people who ship.
          </p>
        </header>

        <section className="mt-12" aria-label="Pricing plans">
          <PricingBentoGrid />
        </section>

        <section aria-label="Feature comparison">
          <FeatureMatrix />
        </section>
      </div>
    </div>
  );
}

export default PremiumPage;
