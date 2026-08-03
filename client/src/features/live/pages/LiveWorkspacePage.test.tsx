import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LiveWorkspacePage } from './LiveWorkspacePage';

describe('LiveWorkspacePage', () => {
  it('renders not-found state when projectId is unknown', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}><MemoryRouter initialEntries={['/live/does-not-exist']}><AuthProvider><Routes><Route path="/live/:projectId" element={<LiveWorkspacePage />} /></Routes></AuthProvider></MemoryRouter></QueryClientProvider>,
    );
    expect(await screen.findByText(/project not found|not a participant/i)).toBeInTheDocument();
  });
});
