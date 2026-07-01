import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLogin } from './queries';
import { authApi } from './api';
import { useAuthStore } from '../../stores/auth';

vi.mock('./api', () => ({
  authApi: { login: vi.fn(), register: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useLogin', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.clearAllMocks();
  });

  it('grava usuario e token no store apos login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'user-1', email: 'm@e.com', name: 'M', role: 'client' },
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'm@e.com', password: 'S3nh@Forte' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe('acc');
    expect(useAuthStore.getState().user?.id).toBe('user-1');
    expect(useAuthStore.getState().user?.role).toBe('client');
  });
});
