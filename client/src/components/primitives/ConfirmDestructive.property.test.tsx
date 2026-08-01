// Feature: githustle-ui-integration, Property 7: ConfirmDestructive respects typed-confirmation gate
import { describe, it, expect, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { ConfirmDestructive } from './ConfirmDestructive';

describe('ConfirmDestructive — Property 7', () => {
  it('armed iff typed === expected exact case-sensitive', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.string({ minLength: 0, maxLength: 12 }),
        (expected, typed) => {
          const onConfirm = vi.fn(); const onCancel = vi.fn();
          const { container, unmount } = render(
            <ConfirmDestructive isOpen title="t" description="d" confirmLabel="ok"
              requireTypedConfirmation={{ prompt: 'type', expected }}
              onConfirm={onConfirm} onCancel={onCancel} />
          );
          const scope = within(container);
          const input = scope.getByRole('textbox') as HTMLInputElement;
          fireEvent.change(input, { target: { value: typed } });
          const btn = scope.getByTestId('confirm-destructive-btn') as HTMLButtonElement;
          const shouldBeArmed = typed === expected;
          expect(btn.dataset.armed).toBe(String(shouldBeArmed));
          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('without typed gate, initial state is armed', () => {
    const { container } = render(<ConfirmDestructive isOpen title="t" description="d" confirmLabel="ok" onConfirm={() => {}} onCancel={() => {}} />);
    const scope = within(container);
    const btn = scope.getByTestId('confirm-destructive-btn') as HTMLButtonElement;
    expect(btn.dataset.armed).toBe('true');
    expect(btn.dataset.pressing).toBe('false');
  });
});
