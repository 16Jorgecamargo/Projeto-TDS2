import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PublishDemandPage from './PublishDemandPage';
import { usePublishDemand } from '../queries';
import { inviteProfessional } from '../api';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../queries', () => ({ usePublishDemand: vi.fn() }));
vi.mock('../api', () => ({ inviteProfessional: vi.fn() }));
vi.mock('../components/DemandForm', () => ({
  DemandForm: ({ onSubmit }: { onSubmit: (values: unknown, images: string[]) => void }) => (
    <button type="button" onClick={() => onSubmit({ title: 'x' }, [])}>
      Simular publicacao
    </button>
  ),
}));

function renderPage(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <PublishDemandPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublishDemandPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('convida o profissional automaticamente quando professionalId esta na URL', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (demand: { id: string }) => void }) => {
      options?.onSuccess({ id: 'd1' });
    });
    vi.mocked(usePublishDemand).mockReturnValue({ mutate, isPending: false } as never);
    vi.mocked(inviteProfessional).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage('/demands/new?professionalId=prof-1');

    await user.click(screen.getByRole('button', { name: 'Simular publicacao' }));

    expect(inviteProfessional).toHaveBeenCalledWith('d1', 'prof-1');
    expect(navigateMock).toHaveBeenCalledWith('/demands/d1');
  });

  it('nao chama inviteProfessional quando nao ha professionalId na URL', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (demand: { id: string }) => void }) => {
      options?.onSuccess({ id: 'd1' });
    });
    vi.mocked(usePublishDemand).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();
    renderPage('/demands/new');

    await user.click(screen.getByRole('button', { name: 'Simular publicacao' }));

    expect(inviteProfessional).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/demands/d1');
  });
});
