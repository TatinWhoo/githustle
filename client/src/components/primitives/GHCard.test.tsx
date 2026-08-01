import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GHCard } from './GHCard';

describe('GHCard', () => {
  it('default variant has border + rounded-2xl', () => {
    const { container } = render(<GHCard>hi</GHCard>);
    expect(container.firstChild).toHaveClass('rounded-2xl');
  });
  it('hero variant wraps content in double-bezel', () => {
    const { container } = render(<GHCard variant="hero">hi</GHCard>);
    expect(container.firstChild).toHaveClass('rounded-[2rem]');
    expect(container.querySelector('[class*="calc(2rem-0.375rem)"]')).toBeTruthy();
  });
});
