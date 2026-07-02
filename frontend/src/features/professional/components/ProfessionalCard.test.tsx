import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalCard } from './ProfessionalCard';

vi.mock('../../favorites/queries', () => ({
  useAddFavorite: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveFavorite: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('ProfessionalCard', () => {
  it('renderiza headline, preco e nota', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        headline="Eletricista João"
        bio="Especialista em instalações residenciais"
        hourlyRate={100}
        ratingAverage={4.5}
        ratingCount={20}
        isAvailable
        isFavorite={false}
      />,
    );

    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
    expect(screen.getByText('R$ 100/h')).toBeInTheDocument();
    expect(screen.getByText('4.5 (20)')).toBeInTheDocument();
    expect(screen.getByText('Disponível agora')).toBeInTheDocument();
  });

  it('mostra "Sob consulta" quando nao ha valor por hora e esconde o badge de disponibilidade', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        headline="Encanador"
        bio={null}
        hourlyRate={null}
        ratingAverage={0}
        ratingCount={0}
        isAvailable={false}
        isFavorite={false}
      />,
    );

    expect(screen.getByText('Sob consulta')).toBeInTheDocument();
    expect(screen.queryByText('Disponível agora')).not.toBeInTheDocument();
  });

  it('linka para o perfil publico', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        headline="Eletricista"
        bio={null}
        hourlyRate={null}
        ratingAverage={0}
        ratingCount={0}
        isAvailable={false}
        isFavorite={false}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/professionals/p1');
  });
});
