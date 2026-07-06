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
        fullName="João Silva"
        headline="Eletricista João"
        bio="Especialista em instalações residenciais"
        hourlyRate={100}
        ratingAverage={4.5}
        ratingCount={20}
        categories={['Eletricista']}
      />,
    );

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
    expect(screen.getByText('R$ 100/h')).toBeInTheDocument();
    expect(screen.getByText('4.5 (20)')).toBeInTheDocument();
    expect(screen.getByText('Eletricista')).toBeInTheDocument();
  });

  it('mostra "Sob consulta" quando nao ha valor por hora e esconde o badge de categoria quando nao ha categorias', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        fullName="Encanador Silva"
        headline="Encanador"
        bio={null}
        hourlyRate={null}
        ratingAverage={0}
        ratingCount={0}
        categories={[]}
      />,
    );

    expect(screen.getByText('Sob consulta')).toBeInTheDocument();
    expect(screen.queryByText('Disponível agora')).not.toBeInTheDocument();
  });

  it('linka para o perfil publico', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        fullName="Eletricista Silva"
        headline="Eletricista"
        bio={null}
        hourlyRate={null}
        ratingAverage={0}
        ratingCount={0}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/professionals/p1');
  });

  it('mostra badge de disponibilidade e botao de favoritar quando fornecidos (uso na pagina de busca)', () => {
    renderWithProviders(
      <ProfessionalCard
        id="p1"
        fullName="Eletricista Silva"
        headline="Eletricista"
        bio={null}
        hourlyRate={null}
        ratingAverage={0}
        ratingCount={0}
        isAvailable
        isFavorite={false}
      />,
    );

    expect(screen.getByText('Disponível agora')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /favoritos/ })).toBeInTheDocument();
  });
});
