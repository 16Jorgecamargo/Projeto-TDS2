import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReducedMotion } from 'framer-motion';
import { App } from './App';

vi.mock('./features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

function mockReducedMotionPreference(matches: boolean) {
  const original = window.matchMedia;
  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  return () => {
    window.matchMedia = original;
  };
}

function ReducedMotionProbe() {
  const reduced = useReducedMotion();
  return <div>reduced-motion:{String(reduced)}</div>;
}

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

  it('propaga a preferencia prefers-reduced-motion para a arvore de componentes motion', () => {
    const restoreMatchMedia = mockReducedMotionPreference(true);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<App />}>
              <Route path="/" element={<ReducedMotionProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('reduced-motion:true')).toBeInTheDocument();
    restoreMatchMedia();
  });
});
