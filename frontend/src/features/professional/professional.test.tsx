import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ProfileForm } from './components/ProfileForm';
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

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProfileForm />
    </QueryClientProvider>,
  );
}

describe('ProfileForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega perfil existente e envia atualizacao com campos numericos vazios como null', async () => {
    vi.mocked(professionalApi.getMyProfile).mockResolvedValue({
      id: 'p1',
      userId: 'u1',
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
    fireEvent.change(screen.getByLabelText(/anos de experiencia/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/valor por hora/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar perfil/i }));

    await waitFor(() => expect(professionalApi.upsertProfile).toHaveBeenCalled());
    expect(vi.mocked(professionalApi.upsertProfile).mock.calls[0][0]).toEqual(
      expect.objectContaining({ headline: 'Novo titulo', yearsExperience: null, hourlyRate: null }),
    );
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
