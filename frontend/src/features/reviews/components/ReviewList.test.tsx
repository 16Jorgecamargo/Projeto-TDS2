import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewList } from './ReviewList';
import { fetchProfessionalReviews } from '../api';

vi.mock('../api', () => ({ fetchProfessionalReviews: vi.fn() }));

function renderList(professionalId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReviewList professionalId={professionalId} />
    </QueryClientProvider>,
  );
}

describe('ReviewList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza avaliacoes com nota e comentario', async () => {
    vi.mocked(fetchProfessionalReviews).mockResolvedValue({
      items: [{ id: 'r1', contractId: 'c1', authorId: 'u1', authorName: 'Ana Souza', demandTitle: 'Instalação elétrica', targetId: 'p1', rating: 4, comment: 'Muito bom', createdAt: '2026-07-01T00:00:00.000Z' }],
      page: 1,
      limit: 20,
      total: 1,
    });

    renderList('p1');

    expect(await screen.findByText('Muito bom')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha avaliacoes', async () => {
    vi.mocked(fetchProfessionalReviews).mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    renderList('p1');

    expect(await screen.findByText('Nenhuma avaliação ainda')).toBeInTheDocument();
  });
});
