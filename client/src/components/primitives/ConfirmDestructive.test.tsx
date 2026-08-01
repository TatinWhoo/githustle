import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDestructive } from './ConfirmDestructive';

describe('ConfirmDestructive', () => {
  it('typed gate: button disabled until exact match', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(); const onCancel = vi.fn();
    render(<ConfirmDestructive isOpen title="Del" description="d" confirmLabel="Delete" requireTypedConfirmation={{ prompt: 'type', expected: 'go@x.com' }} onConfirm={onConfirm} onCancel={onCancel} />);
    const btn = screen.getByTestId('confirm-destructive-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await user.type(screen.getByRole('textbox'), 'go@x.com');
    expect(btn.disabled).toBe(false);
  });

  it('Esc calls onCancel', () => {
    const onCancel = vi.fn(); const onConfirm = vi.fn();
    render(<ConfirmDestructive isOpen title="X" description="d" confirmLabel="Do" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
