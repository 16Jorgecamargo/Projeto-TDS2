import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DemandCard } from './DemandCard';
import { useCategories } from '../../professional/queries';
import { useDeleteDemand } from '../queries';
import { useAuthStore } from '../../../stores/auth';
import type { Demand } from '../api';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));
vi.mock('../queries', () => ({ useDeleteDemand: vi.fn() }));

const baseDemand: Demand = {
  id: 'd1',
  clientId: 'c1',
  clientName: 'Maria Silva',
  categoryId: 'cat1',
  title: 'Pintar sala',
  description: 'x',
  budgetMin: 100,
  budgetMax: 200,
  status: 'open',
  city: 'São Paulo',
  state: 'SP',
  street: 'Rua A',
  number: '123',
  complement: null,
  district: 'Bairro X',
  zipCode: '12345-678',
  images: [],
  tagIds: [],
  quotesCount: 2,
  createdAt: new Date().toISOString(),
};

describe('DemandCard', () => {
  beforeEach(() => {
    vi.mocked(useCategories).mockReturnValue({
      data: [{ id: 'cat1', name: 'Pintura', slug: 'pintura', isActive: true }],
    } as never);
    vi.mocked(useDeleteDemand).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    useAuthStore.getState().setAuth({ id: 'c1', role: 'client' }, 'token');
  });

  it('mostra o titulo, a faixa de orcamento e o badge de status aberta', () => {
    renderWithProviders(<DemandCard demand={baseDemand} onOpen={vi.fn()} />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
  });

  it('mostra a categoria, o contador de orcamentos e a idade da demanda', () => {
    renderWithProviders(<DemandCard demand={baseDemand} onOpen={vi.fn()} />);

    expect(screen.getByText('Pintura')).toBeInTheDocument();
    expect(screen.getByText('2 orçamentos')).toBeInTheDocument();
    expect(screen.getByText('Hoje')).toBeInTheDocument();
  });

  it('mostra o badge Concluída para demanda fechada', () => {
    renderWithProviders(<DemandCard demand={{ ...baseDemand, status: 'closed' }} onOpen={vi.fn()} />);

    expect(screen.getByText('Concluída')).toBeInTheDocument();
    expect(screen.queryByTestId('demand-cancelled-icon')).not.toBeInTheDocument();
  });

  it('distingue o badge Cancelada do badge Concluída com um icone', () => {
    renderWithProviders(<DemandCard demand={{ ...baseDemand, status: 'cancelled' }} onOpen={vi.fn()} />);

    expect(screen.getByText('Cancelada')).toBeInTheDocument();
    expect(screen.getByTestId('demand-cancelled-icon')).toBeInTheDocument();
  });

  it('chama onOpen com o id ao clicar', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DemandCard demand={baseDemand} onOpen={onOpen} />);

    await user.click(screen.getByRole('button', { name: 'Pintar sala' }));

    expect(onOpen).toHaveBeenCalledWith('d1');
  });

  it('abre dialog de confirmacao ao clicar em excluir sem chamar onOpen', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DemandCard demand={baseDemand} onOpen={onOpen} />);

    await user.click(screen.getByRole('button', { name: 'Excluir demanda' }));

    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByText(/Tem certeza que deseja excluir/)).toBeInTheDocument();
  });

  it('confirma exclusao chamando a mutation', async () => {
    const mutate = vi.fn();
    vi.mocked(useDeleteDemand).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();
    renderWithProviders(<DemandCard demand={baseDemand} onOpen={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Excluir demanda' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(mutate).toHaveBeenCalledWith('d1');
  });

  it('nao mostra o botao de excluir para profissional', () => {
    useAuthStore.getState().setAuth({ id: 'p1', role: 'professional' }, 'token');
    renderWithProviders(<DemandCard demand={baseDemand} onOpen={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Excluir demanda' })).not.toBeInTheDocument();
  });
});
