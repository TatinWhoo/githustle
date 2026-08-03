import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ProfilePage } from './ProfilePage';
import { PageHeader } from '@/components/primitives/PageHeader';
import { screen } from '@testing-library/react';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProfilePage', () => {
  it('renders without crashing', () => {
    expect(() => render(<ProfilePage />, { wrapper })).not.toThrow();
  });

  it('renders nothing while auth is loading (user is null)', () => {
    const { container } = render(<ProfilePage />, { wrapper });
    // user starts null during loading — component returns null
    expect(container).toBeEmptyDOMElement();
  });

  it('PageHeader renders h1 with "Profile" when given directly', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Profile" />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: /profile/i })).toBeInTheDocument();
  });
});
