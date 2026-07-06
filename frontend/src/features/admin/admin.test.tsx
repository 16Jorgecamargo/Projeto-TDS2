import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

vi.mock('./queries', () => ({
  useReports: () => ({
    data: {
      items: [{ id: 'r1b2c3d4-0000-4000-8000-000000000041', status: 'pending' }],
      page: 1,
      limit: 20,
      total: 1,
    },
    isLoading: false,
  }),
  useResolveReport: () => ({ mutate: vi.fn(), isPending: false }),
  useDisputes: () => ({
    data: {
      items: [{ id: 'd1b2c3d4-0000-4000-8000-000000000042', status: 'open', outcome: null }],
      page: 1,
      limit: 20,
      total: 1,
    },
    isLoading: false,
  }),
  useResolveDispute: () => ({ mutate: vi.fn(), isPending: false }),
  useUsers: () => ({
    data: {
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    },
    isLoading: false,
  }),
  useSetUserStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useAudit: () => ({
    data: {
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    },
    isLoading: false,
  }),
  useCategories: () => ({ data: [], isLoading: false }),
  useCreateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useTags: () => ({ data: [], isLoading: false }),
  useCreateTag: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWithClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminDashboardPage />
    </QueryClientProvider>,
  );
}

describe('AdminDashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza denúncias e disputas abertas', () => {
    renderWithClient();
    expect(screen.getByText('r1b2c3d4-0000-4000-8000-000000000041')).toBeInTheDocument();
    expect(screen.getByText('d1b2c3d4-0000-4000-8000-000000000042')).toBeInTheDocument();
  });

  it('mostra as ações de resolução disponíveis', () => {
    renderWithClient();
    expect(screen.getByText('Aplicar ação')).toBeInTheDocument();
    expect(screen.getByText('Reembolsar cliente')).toBeInTheDocument();
  });
});
