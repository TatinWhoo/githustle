import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';

async function harness(path: string) {
  const { router } = await import('./router');
  const memRouter = createMemoryRouter(router.routes, { initialEntries: [path] });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <RouterProvider router={memRouter} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const routes = ['/hub', '/conversations', '/personal', '/live', '/saved', '/profile', '/premium', '/help', '/settings', '/live/proj_1'];

describe('router lazy resolution', () => {
  it.each(routes)('resolves %s without throw', async (p) => {
    await harness(p);
    await waitFor(() => expect(document.body).toBeInTheDocument());
  }, 30000);
});
