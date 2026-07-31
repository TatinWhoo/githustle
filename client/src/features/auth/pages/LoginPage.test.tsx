import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthContext } from '../AuthProvider';

function renderLogin(login = vi.fn()) {
  return render(
    <AuthContext.Provider value={{ user: null, status: 'anonymous', role: null, login, register: async () => {}, logout: async () => {}, refetch: async () => {} }}>
      <MemoryRouter><LoginPage /></MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('LoginPage', () => {
  it('shows validation errors when submitting empty', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('calls login with entered credentials', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    renderLogin(login);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret12' });
  });
});
