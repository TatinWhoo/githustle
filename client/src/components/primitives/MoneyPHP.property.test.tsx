// Feature: githustle-ui-integration, Property 5: MoneyPHP formatter matches Intl and is tabular
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { MoneyPHP, formatPHP } from './MoneyPHP';

const REF = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 2 });

describe('MoneyPHP — Property 5', () => {
  it('for any finite amount, formatPHP starts with ₱ or −₱, matches Intl, trims .00 on whole peso', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), (amount) => {
        if (!Number.isFinite(amount)) return;
        const out = formatPHP(amount);
        expect(out.startsWith('₱') || out.startsWith('−₱')).toBe(true);
        const numeric = out.replace(/^−/, '');
        const ref = REF.format(Math.abs(amount)).replace(/\.00$/, '');
        expect(numeric).toBe(ref);
        if (Number.isInteger(amount)) expect(out.endsWith('.00')).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rendered element has font-mono and tabular-nums classes', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e6, max: 1e6, noNaN: true }), (amount) => {
        if (!Number.isFinite(amount)) return;
        const { container } = render(<MoneyPHP amount={amount} />);
        const span = container.querySelector('span')!;
        expect(span.className).toMatch(/font-mono/);
        expect(span.className).toMatch(/tabular-nums/);
      }),
      { numRuns: 100 },
    );
  });
});
