import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthContext } from '@/features/auth/AuthProvider';
import type { SessionStatus } from '@/types/auth';
import type { User } from '@/types/user';

function withAuth(status: SessionStatus, user: User | null, initial = '/hub') {
  return render(
    <AuthContext.Provider
      value={{
        user, status, role: user?.role ?? null,
        login: async () => {}, register: async () => {}, logout: async () => {}, refetch: async () => {},
      }}
    >
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/hub" element={<div>HUB</div>} />
          </Route>
          <Route path="/login" element={<div>LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    withAuth('authenticated', { id: '1', email: 'a@b.co', name: 'A', role: 'client', emailVerified: true });
    expect(screen.getByText('HUB')).toBeInTheDocument();
  });

  it('redirects to /login when anonymous', () => {
    withAuth('anonymous', null);
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });
});
