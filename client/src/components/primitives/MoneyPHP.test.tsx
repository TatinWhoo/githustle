import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyPHP, formatPHP } from './MoneyPHP';

describe('MoneyPHP', () => {
  it('formats zero as ₱0', () => { expect(formatPHP(0)).toBe('₱0'); });
  it('trims .00 on whole peso', () => { expect(formatPHP(1000)).toBe('₱1,000'); });
  it('keeps cents on fractional', () => { expect(formatPHP(1000.5)).toMatch(/₱1,000\.5/); });
  it('renders negative with leading −', () => {
    render(<MoneyPHP amount={-250} />);
    expect(screen.getByText(/^−₱250$/)).toBeInTheDocument();
  });
});
