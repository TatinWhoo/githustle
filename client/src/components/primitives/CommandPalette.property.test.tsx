// Feature: githustle-ui-integration, Property 10: Command palette admin group visibility follows role
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fc from 'fast-check';
import { CommandPalette, usePaletteState } from './CommandPalette';
import { queryKeys } from '@/lib/query/keys';
import { useUiStore } from '@/stores/ui.store';
import { AuthContext } from '@/features/auth/AuthProvider';

const nullAuthValue = {
  user: null as null,
  status: 'anonymous' as const,
  role: null as null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refetch: async () => {},
};

describe('CommandPalette — Property 10', () => {
  beforeEach(() => {
    usePaletteState.setState({ isOpen: false, query: '' });
    useUiStore.getState().setSimulatedRole(null);
  });

  it('admin group renders iff effective role === admin', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'client' | 'freelancer' | 'admin'>('client', 'freelancer', 'admin'),
        fc.string({ minLength: 1, maxLength: 8 }),
        async (role, q) => {
          useUiStore.getState().setSimulatedRole(role);
          const qc = new QueryClient();
          qc.setQueryData(queryKeys.disputes.list(), [{ id: `d_${q}`, projectId: 'p1', milestoneId: 'm1', amount: 100, openedBy: 'u', openedAt: 0, status: 'open' }]);
          qc.setQueryData(queryKeys.notifications.list(), []);

          const { unmount } = render(
            <QueryClientProvider client={qc}>
              <MemoryRouter>
                <AuthContext.Provider value={{ ...nullAuthValue, role: 'client' }}>
                  <CommandPalette />
                </AuthContext.Provider>
              </MemoryRouter>
            </QueryClientProvider>,
          );

          await act(async () => {
            usePaletteState.getState().open();
            usePaletteState.getState().setQuery(q);
          });

          const adminGroup = screen.queryByTestId('palette-group-admin');
          expect(!!adminGroup).toBe(role === 'admin');

          await act(async () => {
            usePaletteState.getState().close();
          });
          unmount();
        },
      ),
      { numRuns: 30 },
    );
  });
});
