import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('marks the current route active', () => {
    render(
      <MemoryRouter initialEntries={['/personal']}>
        <Sidebar role="freelancer" />
      </MemoryRouter>,
    );
    const active = screen.getByRole('link', { name: /Personal Space/i });
    expect(active.className).toMatch(/border-gh-teal/);
  });

  it('hides admin-only nav for non-admins', () => {
    render(
      <MemoryRouter initialEntries={['/hub']}>
        <Sidebar role="freelancer" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Admin Desk/i })).toBeNull();
  });
});
