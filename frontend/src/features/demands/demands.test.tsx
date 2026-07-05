import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemandCard } from './components/DemandCard';

describe('DemandCard', () => {
  it('mostra título e faixa de orçamento formatada', () => {
    render(
      <DemandCard
        demand={{
          id: 'd1',
          clientId: 'c1',
          categoryId: 'cat1',
          title: 'Instalação elétrica',
          description: 'x',
          budgetMin: 100,
          budgetMax: 500,
          status: 'open',
          city: 'São Paulo',
          state: 'SP',
          street: 'Rua B',
          number: '456',
          complement: null,
          district: 'Bairro Y',
          zipCode: '12345-678',
          images: [],
          tagIds: [],
          createdAt: '2026-07-01T12:00:00Z',
        }}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Instalação elétrica')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?100/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?500/)).toBeInTheDocument();
  });
});
