import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import DemandDetailPage from './DemandDetailPage';
import { useDemand, useDemandQuotes, useAcceptQuote, useCreateQuote } from '../queries';
import { useAuthStore } from '../../../stores/auth';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'd1' }) };
});
vi.mock('../queries', () => ({
  useDemand: vi.fn(),
  useDemandQuotes: vi.fn(),
  useAcceptQuote: vi.fn(),
  useCreateQuote: vi.fn(),
}));
vi.mock('../components/QuoteCard', () => ({ QuoteCard: () => <div>quote-card</div> }));
vi.mock('../components/InviteProfessionalDialog', () => ({
  InviteProfessionalDialog: () => <div>invite-dialog</div>,
}));
vi.mock('../components/QuoteForm', () => ({ QuoteForm: () => <div>quote-form</div> }));

const demand = {
  id: 'd1',
  title: 'Pintar sala',
  description: 'Pintura completa',
  status: 'open',
  images: [{ url: '/uploads/foto1.jpg', position: 0 }],
};

describe('DemandDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    vi.mocked(useAcceptQuote).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCreateQuote).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('renderiza titulo, descricao, fotos e orcamentos', () => {
    vi.mocked(useDemand).mockReturnValue({ data: demand, isPending: false } as never);
    vi.mocked(useDemandQuotes).mockReturnValue({ data: [{ id: 'q1' }] } as never);

    renderWithProviders(<DemandDetailPage />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
    expect(screen.getByText('Pintura completa')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/uploads/foto1.jpg');
    expect(screen.getByText('quote-card')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha orcamentos', () => {
    vi.mocked(useDemand).mockReturnValue({ data: demand, isPending: false } as never);
    vi.mocked(useDemandQuotes).mockReturnValue({ data: [] } as never);

    renderWithProviders(<DemandDetailPage />);

    expect(screen.getByText('Nenhum orçamento recebido ainda')).toBeInTheDocument();
  });

  it('mostra QuoteForm apenas para profissional em demanda aberta', () => {
    vi.mocked(useDemand).mockReturnValue({ data: demand, isPending: false } as never);
    vi.mocked(useDemandQuotes).mockReturnValue({ data: [] } as never);
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 'token');

    renderWithProviders(<DemandDetailPage />);

    expect(screen.getByText('quote-form')).toBeInTheDocument();
  });
});
