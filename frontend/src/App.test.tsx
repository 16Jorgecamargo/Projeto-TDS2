import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';

vi.mock('./features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('App shell', () => {
  it('renders the app shell around routed content', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<App />}>
              <Route path="/" element={<div>home content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('home content')).toBeInTheDocument();
  });
});
