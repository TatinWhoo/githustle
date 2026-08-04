import { useState } from 'react';

const METHODS = ['gcash', 'maya', 'bank', 'card', 'paypal'] as const;

type PaymentMethod = (typeof METHODS)[number];

export function PaymentMethodsSection() {
  const [selected, setSelected] = useState<PaymentMethod>('gcash');

  return (
    <section id="payments">
      <h2 className="font-display text-lg mb-3">Payment methods</h2>
      <div className="flex gap-2 flex-wrap">
        {METHODS.map((m) => (
          <button
            key={m}
            onClick={() => setSelected(m)}
            className={`capitalize text-sm px-4 py-2 rounded-md border ${
              selected === m
                ? 'bg-gh-ink text-white border-gh-ink'
                : 'border-border hover:border-gh-teal'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </section>
  );
}
