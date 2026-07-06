import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ProfessionalProfileEditPage } from './pages/ProfessionalProfileEditPage';
import { professionalApi } from './api';
import { useAddPortfolioImage, useRemovePortfolioImage } from './queries';

vi.mock('./api', () => ({
  professionalApi: {
    getMyProfile: vi.fn(),
    upsertProfile: vi.fn(),
    addPortfolioImage: vi.fn(),
    removePortfolioImage: vi.fn(),
  },
}));
vi.mock('./components/PortfolioManager', () => ({ PortfolioManager: () => null }));
vi.mock('./components/AvailabilityManager', () => ({ AvailabilityManager: () => null }));
vi.mock('./components/ServiceAreaManager', () => ({ ServiceAreaManager: () => null }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderForm() {
  return renderWithProviders(<ProfessionalProfileEditPage />);
}

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega perfil existente e envia atualizacao com campos numericos vazios como null', async () => {
    vi.mocked(professionalApi.getMyProfile).mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      fullName: 'Joao Silva',
      headline: 'Antigo',
      bio: null,
      yearsExperience: 5,
      hourlyRate: 100,
      serviceRadiusKm: 20,
      ratingAverage: 0,
      ratingCount: 0,
      isAvailable: true,
      verifiedAt: null,
      createdAt: '2026-07-01T00:00:00Z',
    });
    vi.mocked(professionalApi.upsertProfile).mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      fullName: 'Joao Silva',
      headline: 'Novo titulo',
      bio: null,
      yearsExperience: null,
      hourlyRate: null,
      serviceRadiusKm: 20,
      ratingAverage: 0,
      ratingCount: 0,
      isAvailable: true,
      verifiedAt: null,
      createdAt: '2026-07-01T00:00:00Z',
    });

    renderForm();
    const headline = await screen.findByDisplayValue('Antigo');
    fireEvent.change(headline, { target: { value: 'Novo titulo' } });
    fireEvent.change(screen.getByLabelText(/anos de experiência/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/valor por hora/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    await waitFor(() => expect(professionalApi.upsertProfile).toHaveBeenCalled());
    expect(vi.mocked(professionalApi.upsertProfile).mock.calls[0][0]).toEqual(
      expect.objectContaining({ headline: 'Novo titulo', yearsExperience: null, hourlyRate: null }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/professional/dashboard'));
  });

  it('cada campo tem label associado via htmlFor/id', async () => {
    vi.mocked(professionalApi.getMyProfile).mockResolvedValue({
      id: 'p1', userId: 'u1', fullName: 'Joao Silva', headline: 'Antigo', bio: null, yearsExperience: 5,
      hourlyRate: 100, serviceRadiusKm: 20, ratingAverage: 0, ratingCount: 0,
      isAvailable: true, verifiedAt: null, createdAt: '2026-07-01T00:00:00Z',
    });

    renderForm();
    await screen.findByDisplayValue('Antigo');

    expect(screen.getByLabelText('Título')).toHaveAttribute('id', 'profile-headline');
    expect(screen.getByLabelText('Biografia')).toHaveAttribute('id', 'profile-bio');
    expect(screen.getByLabelText('Anos de experiência')).toHaveAttribute('id', 'profile-years-experience');
    expect(screen.getByLabelText('Valor por hora (R$)')).toHaveAttribute('id', 'profile-hourly-rate');
    expect(screen.getByLabelText('Raio de atendimento (km)')).toHaveAttribute('id', 'profile-service-radius');
  });
});

describe('useAddPortfolioImage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama professionalApi.addPortfolioImage com o itemId fixo do hook', async () => {
    vi.mocked(professionalApi.addPortfolioImage).mockResolvedValue({
      id: 'img1',
      imageUrl: '/uploads/img1.jpg',
      position: 0,
    });

    const { result } = renderHook(() => useAddPortfolioImage('prof1', 'item1'), { wrapper });
    result.current.mutate({ imageUrl: '/uploads/img1.jpg', position: 0 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(professionalApi.addPortfolioImage).toHaveBeenCalledWith('item1', {
      imageUrl: '/uploads/img1.jpg',
      position: 0,
    });
  });
});

describe('useRemovePortfolioImage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama professionalApi.removePortfolioImage com o id da imagem', async () => {
    vi.mocked(professionalApi.removePortfolioImage).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemovePortfolioImage('prof1'), { wrapper });
    result.current.mutate('img1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(professionalApi.removePortfolioImage).toHaveBeenCalledWith('img1');
  });
});
