import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PageShellSection } from './PageShellSection';

describe('PageShellSection', () => {
  it('renders max-w-7xl with default md py', () => {
    const { container } = render(<PageShellSection>ok</PageShellSection>);
    expect(container.firstChild).toHaveClass('max-w-7xl');
    expect(container.firstChild).toHaveClass('py-8');
  });
});
