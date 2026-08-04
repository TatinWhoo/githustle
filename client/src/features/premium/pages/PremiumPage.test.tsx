import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { PremiumPage } from './PremiumPage';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PremiumPage', () => {
  it('renders h1 with "Premium"', () => {
    const { container } = render(<PremiumPage />, { wrapper });
    expect(screen.getByRole('heading', { level: 1, name: /premium/i })).toBeInTheDocument();
    expect(container.querySelector('[data-theme="editorial"]')).toBeTruthy();
  });

  it('renders all three pricing tiers', () => {
    render(<PremiumPage />, { wrapper });
    expect(screen.getByText(/get started/i)).toBeInTheDocument();
    expect(screen.getByText(/for serious operators/i)).toBeInTheDocument();
    expect(screen.getByText(/for agencies/i)).toBeInTheDocument();
  });

  it('renders feature comparison table', () => {
    render(<PremiumPage />, { wrapper });
    expect(screen.getByText('Proposals per month')).toBeInTheDocument();
    expect(screen.getByText('Priority placement')).toBeInTheDocument();
  });

  it('renders three Upgrade buttons', () => {
    render(<PremiumPage />, { wrapper });
    const buttons = screen.getAllByRole('button', { name: /upgrade/i });
    expect(buttons).toHaveLength(3);
  });
});
