import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { SettingsPage } from './SettingsPage';

function harness(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  it('renders page title', () => {
    harness(<SettingsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('renders all non-auth-gated section headings', () => {
    harness(<SettingsPage />);
    const headings = ['Account', 'Preferences', 'Notifications', 'Payment methods'];
    for (const label of headings) {
      expect(
        screen.getByRole('heading', { level: 2, name: new RegExp(label, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('renders subnav with anchor links', () => {
    harness(<SettingsPage />);
    const nav = screen.getByRole('navigation', { name: /sections/i });
    expect(nav).toBeInTheDocument();
    expect(nav.querySelectorAll('a').length).toBe(5);
  });
});
