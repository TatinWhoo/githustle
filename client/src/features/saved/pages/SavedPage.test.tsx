import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { SavedPage } from './SavedPage';
import { useSavedJobs } from '@/stores/savedJobs.store';

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(new Error('not authenticated')),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SavedPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSavedJobs.setState({ ids: new Set(), authSessionId: null });
  });

  it('renders empty state when no saved ids', () => {
    render(<SavedPage />, { wrapper: Wrapper });
    expect(screen.getByText(/no saved jobs yet/i)).toBeInTheDocument();
  });
});
