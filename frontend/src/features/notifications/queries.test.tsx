import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useNotifications } from './queries';
import { fetchNotifications } from './api';

vi.mock('./api', () => ({ fetchNotifications: vi.fn(), markNotificationRead: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useNotifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nao chama fetchNotifications quando enabled e false', () => {
    vi.mocked(fetchNotifications).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    renderHook(() => useNotifications(1, { enabled: false }), { wrapper });

    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  it('chama fetchNotifications quando enabled e true (padrao)', () => {
    vi.mocked(fetchNotifications).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    renderHook(() => useNotifications(1, { enabled: true }), { wrapper });

    expect(fetchNotifications).toHaveBeenCalledWith(1);
  });
});
