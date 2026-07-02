import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemandCard } from './DemandCard';
import type { Demand } from '../api';

const baseDemand: Demand = {
  id: 'd1',
  clientId: 'c1',
  categoryId: 'cat1',
  title: 'Pintar sala',
  description: 'x',
  budgetMin: 100,
  budgetMax: 200,
  status: 'open',
  addressId: null,
  images: [],
  tagIds: [],
  createdAt: '',
};

describe('DemandCard', () => {
  it('mostra o titulo, a faixa de orcamento e o badge de status aberta', () => {
    render(<DemandCard demand={baseDemand} onOpen={vi.fn()} />);

    expect(screen.getByText('Pintar sala')).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
  });

  it('mostra o badge Concluída para demanda fechada', () => {
    render(<DemandCard demand={{ ...baseDemand, status: 'closed' }} onOpen={vi.fn()} />);

    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });

  it('chama onOpen com o id ao clicar', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<DemandCard demand={baseDemand} onOpen={onOpen} />);

    await user.click(screen.getByRole('button'));

    expect(onOpen).toHaveBeenCalledWith('d1');
  });
});
