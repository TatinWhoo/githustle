import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('renders label for each status', () => {
    render(<StatusPill status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });
});
