import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommandPalette, usePaletteState } from './CommandPalette';
import { AuthContext } from '@/features/auth/AuthProvider';

const nullAuthValue = {
  user: null,
  status: 'anonymous' as const,
  role: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refetch: async () => {},
};

function harness(authOverrides = {}) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthContext.Provider value={{ ...nullAuthValue, ...authOverrides }}>
          <CommandPalette />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // Reset palette state between tests
  usePaletteState.setState({ isOpen: false, query: '' });
});

describe('CommandPalette', () => {
  it('does not render when closed', () => {
    harness();
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
  });

  it('renders when opened via store', async () => {
    harness();
    await act(async () => {
      usePaletteState.getState().open();
    });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('shows Navigation group with default nav items when open and no query', async () => {
    harness();
    await act(async () => {
      usePaletteState.getState().open();
    });
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Hub')).toBeInTheDocument();
  });

  it('does not show Admin nav item for non-admin role', async () => {
    harness({ role: 'freelancer' });
    await act(async () => {
      usePaletteState.getState().open();
    });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('shows Admin nav item for admin role', async () => {
    const user = userEvent.setup();
    harness({ role: 'admin', user: { id: '1', name: 'Ada', email: 'a@b.co', role: 'admin', emailVerified: true } });
    await act(async () => {
      usePaletteState.getState().open();
    });
    // Type "admin" to surface the Admin nav entry via Fuse search
    await user.type(screen.getByPlaceholderText('Search…'), 'admin');
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('closes when close() is called', async () => {
    harness();
    await act(async () => {
      usePaletteState.getState().open();
    });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    await act(async () => {
      usePaletteState.getState().close();
    });
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
  });
});
