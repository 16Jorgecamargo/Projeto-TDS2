import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalProfileHeader } from './ProfessionalProfileHeader';
import { useCreateRoom } from '../../chat/queries';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../chat/queries', () => ({ useCreateRoom: vi.fn() }));
vi.mock('../../favorites/queries', () => ({
  useAddFavorite: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveFavorite: () => ({ mutate: vi.fn(), isPending: false }),
}));

const profile = {
  id: 'prof-1',
  userId: 'user-1',
  fullName: 'João Silva',
  headline: 'Eletricista João',
  bio: null,
  yearsExperience: null,
  hourlyRate: null,
  serviceRadiusKm: null,
  ratingAverage: 4.5,
  ratingCount: 12,
  isAvailable: true,
  verifiedAt: null,
  createdAt: '',
  categories: [{ id: 'c1', name: 'Elétrica', slug: 'eletrica' }],
  experiences: [],
  education: [],
  certifications: [],
  serviceAreas: [],
} as never;

describe('ProfessionalProfileHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateRoom).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('renderiza headline, categoria e nota', () => {
    renderWithProviders(<ProfessionalProfileHeader profile={profile} isFavorite={false} />);

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
    expect(screen.getByText('Elétrica')).toBeInTheDocument();
    expect(screen.getByText('4.5 (12)')).toBeInTheDocument();
  });

  it('navega para /demands/new com o professionalId ao clicar em Contratar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfessionalProfileHeader profile={profile} isFavorite={false} />);

    await user.click(screen.getByRole('button', { name: 'Contratar' }));

    expect(navigateMock).toHaveBeenCalledWith('/demands/new?professionalId=prof-1');
  });

  it('cria sala de chat com o userId do profissional e navega ao sucesso', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (room: { id: string }) => void }) => {
      options?.onSuccess({ id: 'room-1' });
    });
    vi.mocked(useCreateRoom).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();
    renderWithProviders(<ProfessionalProfileHeader profile={profile} isFavorite={false} />);

    await user.click(screen.getByRole('button', { name: 'Chat' }));

    expect(mutate).toHaveBeenCalledWith({ participantId: 'user-1' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(navigateMock).toHaveBeenCalledWith('/chat/room-1');
  });
});
