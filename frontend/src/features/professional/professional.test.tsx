import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileForm } from './components/ProfileForm';
import { professionalApi } from './api';

vi.mock('./api', () => ({
  professionalApi: { getMyProfile: vi.fn(), upsertProfile: vi.fn() },
}));

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
