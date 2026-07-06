import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { DemandCard } from './components/DemandCard';
import { useCategories } from '../professional/queries';
import { useDeleteDemand } from './queries';

vi.mock('../professional/queries', () => ({ useCategories: vi.fn(() => ({ data: [] })) }));
vi.mock('./queries', () => ({ useDeleteDemand: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) }));

describe('DemandCard', () => {
  it('mostra o título da demanda', () => {
    vi.mocked(useCategories).mockReturnValue({ data: [] } as never);
    vi.mocked(useDeleteDemand).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    renderWithProviders(
      <DemandCard
        demand={{
          id: 'd1',
          clientId: 'c1',
          clientName: 'Maria Silva',
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
          quotesCount: 0,
          createdAt: '2026-07-01T12:00:00Z',
        }}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Instalação elétrica')).toBeInTheDocument();
  });
});
