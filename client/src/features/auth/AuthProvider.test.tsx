import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './hooks/useAuth';
import { authApi } from './api/auth.api';

vi.mock('./api/auth.api', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), register: vi.fn() },
}));

function Probe() {
  const { status, user } = useAuth();
  return <div>{status}:{user?.name ?? 'none'}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hydrates an authenticated session from /auth/me', async () => {
    (authApi.me as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1', email: 'a@b.co', name: 'Ada', role: 'freelancer', emailVerified: true,
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('authenticated:Ada')).toBeInTheDocument());
  });

  it('falls back to anonymous when /auth/me rejects', async () => {
    (authApi.me as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('anonymous:none')).toBeInTheDocument());
  });
});
