// Feature: githustle-ui-integration, Property 6: StatusPill mapping is exhaustive
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { StatusPill, STATUS_MAP, ALL_STATUSES, type PillStatus } from './StatusPill';

describe('StatusPill — Property 6', () => {
  it('every PillStatus renders with non-empty bg + text + dot bg = text token', () => {
    fc.assert(
      fc.property(fc.constantFrom<PillStatus>(...ALL_STATUSES), (status) => {
        const m = STATUS_MAP[status];
        expect(m.bg.length).toBeGreaterThan(0);
        expect(m.text.length).toBeGreaterThan(0);
        const { container } = render(<StatusPill status={status} />);
        const pill = container.querySelector(`[data-testid="status-${status}"]`)!;
        const dot = pill.querySelector('span[aria-hidden]')!;
        const expectedDotClass = m.text.replace('text-', 'bg-');
        expect(dot.className.includes(expectedDotClass)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('ALL_STATUSES contains all 15 members', () => {
    expect(ALL_STATUSES).toHaveLength(15);
  });
});
