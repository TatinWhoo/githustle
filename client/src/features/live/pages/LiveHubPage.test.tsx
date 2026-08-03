import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LiveHubPage } from './LiveHubPage';

describe('LiveHubPage', () => {
  it('renders title', () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthProvider><LiveHubPage /></AuthProvider></MemoryRouter></QueryClientProvider>);
    expect(screen.getByRole('heading', { level: 1, name: /live workspaces/i })).toBeInTheDocument();
  });
});
